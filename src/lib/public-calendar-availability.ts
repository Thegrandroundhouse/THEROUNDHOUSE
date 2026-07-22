import type { SupabaseClient } from "@supabase/supabase-js";
import {
  blocksForDate,
  dayBlockLevel,
  listVenueHalls,
  loadCalendarBlocks,
  type CalendarBlockRow,
} from "@/lib/booking-halls";
import { isWholeDaySlotKey, type BookingSlotsConfig } from "@/lib/booking-slots";

type BookingRow = { event_date: string; event_slot_key: string | null; hall_ids: string[] };

export type ActiveDateHold = {
  date: string;
  space_id: string | null;
  event_slot_key: string | null;
};

/** Active (unreleased, not expired) date holds. */
export async function loadActiveDateHolds(
  supabase: SupabaseClient,
  startStr: string,
  endStr: string,
): Promise<ActiveDateHold[]> {
  const nowIso = new Date().toISOString();
  const { data } = await supabase
    .from("date_holds")
    .select("hold_date, space_id, event_slot_key, expires_at")
    .is("released_at", null)
    .gte("hold_date", startStr)
    .lte("hold_date", endStr);

  return (data ?? [])
    .filter((r) => {
      const exp = r.expires_at as string | null;
      return !exp || exp > nowIso;
    })
    .map((r) => ({
      date: r.hold_date as string,
      space_id: (r.space_id as string | null) ?? null,
      event_slot_key: (r.event_slot_key as string | null) ?? null,
    }));
}

/** Whole-day holds only — same shape as manual calendar closes. */
export async function loadActiveDateHoldsAsBlocks(
  supabase: SupabaseClient,
  startStr: string,
  endStr: string,
): Promise<CalendarBlockRow[]> {
  const holds = await loadActiveDateHolds(supabase, startStr, endStr);
  return holds
    .filter((h) => isWholeDaySlotKey(h.event_slot_key))
    .map((h) => ({
      date: h.date,
      space_id: h.space_id,
    }));
}

/** Slot-only holds (not whole-day) — reduce public slot capacity. */
export function slotHoldCountsByDate(holds: ActiveDateHold[]): Map<string, Record<string, number>> {
  const map = new Map<string, Record<string, number>>();
  for (const h of holds) {
    if (isWholeDaySlotKey(h.event_slot_key)) continue;
    const key = String(h.event_slot_key).trim();
    if (!map.has(h.date)) map.set(h.date, {});
    const counts = map.get(h.date)!;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return map;
}

export function mergeCalendarBlocks(...lists: CalendarBlockRow[][]): CalendarBlockRow[] {
  return lists.flat();
}

/** Whole venue manually closed, or every hall manually closed. */
export function isDateFullyManuallyBlocked(
  blocks: CalendarBlockRow[],
  date: string,
  allHallIds: string[],
): boolean {
  return dayBlockLevel(blocks, date, allHallIds) === "full";
}

/** Some halls manually closed but at least one hall still open. */
export function isDatePartiallyManuallyBlocked(
  blocks: CalendarBlockRow[],
  date: string,
  allHallIds: string[],
): boolean {
  return dayBlockLevel(blocks, date, allHallIds) === "partial";
}

function hallIsBookedOnDate(hallId: string, dayBookings: BookingRow[]): boolean {
  return dayBookings.some((b) => !b.hall_ids.length || b.hall_ids.includes(hallId));
}

/** At least one hall is not manually blocked (ignores bookings). */
export function hasAnyHallOpenManually(
  blocks: CalendarBlockRow[],
  date: string,
  allHallIds: string[],
): boolean {
  const info = blocksForDate(blocks, date);
  if (info.wholeVenue) return false;
  if (!allHallIds.length) return !info.hallIds.length && !info.wholeVenue;
  return allHallIds.some((id) => !info.hallIds.includes(id));
}

/** Public enquiry: date is open if not fully manually closed and (slots free or whole-day mode with capacity). */
export async function isDateOpenForPublicEnquiryHalls(
  supabase: SupabaseClient,
  dateStr: string,
  config: BookingSlotsConfig,
  blocks: CalendarBlockRow[],
  allHallIds: string[],
  slotHoldCounts: Record<string, number> = {},
): Promise<boolean> {
  if (isDateFullyManuallyBlocked(blocks, dateStr, allHallIds)) return false;
  if (!hasAnyHallOpenManually(blocks, dateStr, allHallIds)) return false;

  if (!config.enabled || !config.slots.length) {
    const { data: rows } = await supabase
      .from("bookings")
      .select("id")
      .eq("event_date", dateStr)
      .in("status", ["pending", "confirmed", "completed"])
      .limit(1);
    return (rows ?? []).length === 0;
  }

  const { data: rows } = await supabase
    .from("bookings")
    .select("event_slot_key")
    .eq("event_date", dateStr)
    .in("status", ["pending", "confirmed", "completed"]);
  const list = rows ?? [];
  if (list.some((b) => isWholeDaySlotKey(b.event_slot_key as string | null))) {
    return false;
  }
  const counts: Record<string, number> = {};
  for (const s of config.slots) counts[s.key] = slotHoldCounts[s.key] ?? 0;
  for (const b of list) {
    const k = b.event_slot_key as string;
    if (k in counts) counts[k] += 1;
  }
  return config.slots.some((s) => (counts[s.key] ?? 0) < config.maxPerSlot);
}

export async function computePublicMonthAvailability(
  supabase: SupabaseClient,
  startStr: string,
  endStr: string,
  config: BookingSlotsConfig,
): Promise<{ fullyBooked: Set<string>; partialDates: Set<string> }> {
  const halls = await listVenueHalls(supabase);
  const allHallIds = halls.map((h) => h.id);
  const [manualBlocks, holds] = await Promise.all([
    loadCalendarBlocks(supabase, startStr, endStr),
    loadActiveDateHolds(supabase, startStr, endStr),
  ]);
  const holdBlocks = holds
    .filter((h) => isWholeDaySlotKey(h.event_slot_key))
    .map((h) => ({ date: h.date, space_id: h.space_id }));
  const blocks = mergeCalendarBlocks(manualBlocks, holdBlocks);
  const holdsBySlot = slotHoldCountsByDate(holds);

  const { data: bookingsRaw } = await supabase
    .from("bookings")
    .select("id, event_date, event_slot_key, space_id")
    .gte("event_date", startStr)
    .lte("event_date", endStr)
    .in("status", ["pending", "confirmed", "completed"]);

  const ids = (bookingsRaw ?? []).map((b) => b.id as string);
  const hallMap = new Map<string, string[]>();
  if (ids.length) {
    const { data: links } = await supabase.from("booking_spaces").select("booking_id, space_id").in("booking_id", ids);
    for (const row of links ?? []) {
      const bid = row.booking_id as string;
      if (!hallMap.has(bid)) hallMap.set(bid, []);
      hallMap.get(bid)!.push(row.space_id as string);
    }
    for (const b of bookingsRaw ?? []) {
      const bid = b.id as string;
      if (!hallMap.has(bid) || hallMap.get(bid)!.length === 0) {
        const legacy = b.space_id ? [b.space_id as string] : [];
        if (legacy.length) hallMap.set(bid, legacy);
      }
    }
  }

  const bookingRows: BookingRow[] = (bookingsRaw ?? []).map((b) => ({
    event_date: b.event_date as string,
    event_slot_key: (b.event_slot_key as string | null) ?? null,
    hall_ids: hallMap.get(b.id as string) ?? [],
  }));

  const fullyBooked = new Set<string>();
  const partialDates = new Set<string>();
  const slotsEnabled = config.enabled && config.slots.length > 0;

  const datesInRange = new Set<string>();
  for (const b of blocks) datesInRange.add(b.date);
  for (const b of bookingRows) datesInRange.add(b.event_date);
  for (const h of holds) datesInRange.add(h.date);

  const [y1, m1, d1] = startStr.split("-").map(Number);
  const [y2, m2, d2] = endStr.split("-").map(Number);
  const cur = new Date(y1, m1 - 1, d1);
  const end = new Date(y2, m2 - 1, d2);
  while (cur <= end) {
    const ds = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
    datesInRange.add(ds);
    cur.setDate(cur.getDate() + 1);
  }

  for (const date of datesInRange) {
    if (date < startStr || date > endStr) continue;

    if (isDateFullyManuallyBlocked(blocks, date, allHallIds)) {
      fullyBooked.add(date);
      continue;
    }

    const dayBookings = bookingRows.filter((b) => b.event_date === date);
    const daySlotHolds = holdsBySlot.get(date) ?? {};

    if (allHallIds.length) {
      if (isDatePartiallyManuallyBlocked(blocks, date, allHallIds)) {
        partialDates.add(date);
      }

      // Whole-day mode only: if every hall is taken by a booking, day is full.
      // With time slots, hall bookings for one slot must not wipe remaining slots.
      if (!slotsEnabled) {
        const openHalls = allHallIds.filter((hid) => {
          const info = blocksForDate(blocks, date);
          if (info.wholeVenue || info.hallIds.includes(hid)) return false;
          return !hallIsBookedOnDate(hid, dayBookings);
        });
        if (openHalls.length === 0 && dayBookings.length > 0) {
          fullyBooked.add(date);
          continue;
        }
      }
    } else if (!slotsEnabled && dayBookings.length > 0) {
      fullyBooked.add(date);
      continue;
    }

    if (!slotsEnabled) {
      if (dayBookings.length > 0) fullyBooked.add(date);
      continue;
    }

    if (dayBookings.some((b) => isWholeDaySlotKey(b.event_slot_key))) {
      fullyBooked.add(date);
      continue;
    }

    const counts: Record<string, number> = {};
    for (const s of config.slots) counts[s.key] = daySlotHolds[s.key] ?? 0;
    for (const b of dayBookings) {
      const k = b.event_slot_key!;
      if (k in counts) counts[k] += 1;
    }
    const allFull = config.slots.every((s) => (counts[s.key] ?? 0) >= config.maxPerSlot);
    const anyTaken =
      dayBookings.length > 0 ||
      Object.values(daySlotHolds).some((n) => n > 0) ||
      isDatePartiallyManuallyBlocked(blocks, date, allHallIds);
    if (allFull) fullyBooked.add(date);
    else if (anyTaken) partialDates.add(date);
  }

  for (const d of partialDates) {
    if (fullyBooked.has(d)) partialDates.delete(d);
  }

  return { fullyBooked, partialDates };
}
