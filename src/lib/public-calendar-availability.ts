import type { SupabaseClient } from "@supabase/supabase-js";
import {
  blocksForDate,
  dayBlockLevel,
  listVenueHalls,
  loadCalendarBlocks,
  type CalendarBlockRow,
} from "@/lib/booking-halls";
import type { BookingSlotsConfig } from "@/lib/booking-slots";

type BookingRow = { event_date: string; event_slot_key: string | null; hall_ids: string[] };

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
  if (list.some((b) => !b.event_slot_key || String(b.event_slot_key).trim() === "")) {
    return false;
  }
  const counts: Record<string, number> = {};
  for (const s of config.slots) counts[s.key] = 0;
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
  const blocks = await loadCalendarBlocks(supabase, startStr, endStr);

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

  const datesInRange = new Set<string>();
  for (const b of blocks) datesInRange.add(b.date);
  for (const b of bookingRows) datesInRange.add(b.event_date);

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
    let hallFullyTaken = false;
    if (allHallIds.length) {
      const openHalls = allHallIds.filter((hid) => {
        const info = blocksForDate(blocks, date);
        if (info.wholeVenue || info.hallIds.includes(hid)) return false;
        return !hallIsBookedOnDate(hid, dayBookings);
      });
      if (openHalls.length === 0 && (dayBookings.length > 0 || isDatePartiallyManuallyBlocked(blocks, date, allHallIds))) {
        hallFullyTaken = true;
      }
      if (openHalls.length === 0 && isDatePartiallyManuallyBlocked(blocks, date, allHallIds)) {
        fullyBooked.add(date);
        continue;
      }
      if (isDatePartiallyManuallyBlocked(blocks, date, allHallIds)) {
        partialDates.add(date);
      }
    } else {
      if (dayBookings.length > 0 && (!config.enabled || !config.slots.length)) {
        fullyBooked.add(date);
        continue;
      }
    }

    if (hallFullyTaken && dayBookings.length > 0) {
      fullyBooked.add(date);
      continue;
    }

    if (!config.enabled || !config.slots.length) {
      if (dayBookings.length > 0) fullyBooked.add(date);
      continue;
    }

    if (dayBookings.some((b) => !b.event_slot_key || String(b.event_slot_key).trim() === "")) {
      fullyBooked.add(date);
      continue;
    }

    const counts: Record<string, number> = {};
    for (const s of config.slots) counts[s.key] = 0;
    for (const b of dayBookings) {
      const k = b.event_slot_key!;
      if (k in counts) counts[k] += 1;
    }
    const allFull = config.slots.every((s) => (counts[s.key] ?? 0) >= config.maxPerSlot);
    if (allFull) fullyBooked.add(date);
    else if (dayBookings.length > 0) partialDates.add(date);
  }

  for (const d of partialDates) {
    if (fullyBooked.has(d)) partialDates.delete(d);
  }

  return { fullyBooked, partialDates };
}
