import type { SupabaseClient } from "@supabase/supabase-js";

export type SlotDef = { key: string; label: string; timeLabel: string };

export type BookingSlotsConfig = {
  enabled: boolean;
  maxPerSlot: number;
  slots: SlotDef[];
  /** When true, admin/enquiry forms can offer “full venue / whole day”. Settings → Booking slots. */
  allowWholeDay: boolean;
  /** Shown next to the whole-day option (e.g. policy line). */
  wholeDayLabel: string;
};

export const DEFAULT_BOOKING_SLOTS: BookingSlotsConfig = {
  enabled: true,
  maxPerSlot: 1,
  allowWholeDay: true,
  wholeDayLabel: "Full venue (whole day) — blocks every other slot on this date.",
  slots: [
    { key: "morning", label: "Morning", timeLabel: "9:00 – 12:00" },
    { key: "afternoon", label: "Afternoon", timeLabel: "12:00 – 17:00" },
    { key: "evening", label: "Evening", timeLabel: "17:00 – 22:00" },
    { key: "night", label: "Night", timeLabel: "22:00 – 02:00" },
  ],
};

export function parseBookingSlots(raw: unknown): BookingSlotsConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...DEFAULT_BOOKING_SLOTS };
  const o = raw as Record<string, unknown>;
  const slotsRaw = o.slots;
  const slots: SlotDef[] = Array.isArray(slotsRaw)
    ? slotsRaw
        .map((x) => {
          if (!x || typeof x !== "object") return null;
          const s = x as Record<string, unknown>;
          const key = typeof s.key === "string" ? s.key.trim() : "";
          if (!key) return null;
          return {
            key,
            label: typeof s.label === "string" ? s.label : key,
            timeLabel: typeof s.timeLabel === "string" ? s.timeLabel : "",
          };
        })
        .filter((x): x is SlotDef => x != null)
    : DEFAULT_BOOKING_SLOTS.slots;
  return {
    enabled: o.enabled === true,
    maxPerSlot: typeof o.maxPerSlot === "number" && o.maxPerSlot > 0 ? Math.min(20, o.maxPerSlot) : 1,
    allowWholeDay: o.allowWholeDay !== false,
    wholeDayLabel:
      typeof o.wholeDayLabel === "string" && o.wholeDayLabel.trim()
        ? o.wholeDayLabel.trim().slice(0, 280)
        : DEFAULT_BOOKING_SLOTS.wholeDayLabel,
    slots: slots.length ? slots : DEFAULT_BOOKING_SLOTS.slots,
  };
}

export async function getBookingSlotsConfig(supabase: SupabaseClient): Promise<BookingSlotsConfig> {
  const { data } = await supabase.from("site_settings").select("value").eq("key", "booking_slots").maybeSingle();
  return parseBookingSlots(data?.value);
}

type BookingRow = { event_date: string; event_slot_key: string | null };

/** Full-venue / whole-day bookings: empty, null, or explicit "whole_day". */
export function isWholeDaySlotKey(slotKey: string | null | undefined): boolean {
  if (slotKey == null) return true;
  const k = String(slotKey).trim();
  return k === "" || k === "whole_day";
}

/** Dates that have no free slots (or manual block). Used by public calendar. */
export function computeFullyBookedDates(
  bookings: BookingRow[],
  manualBlocked: Set<string>,
  config: BookingSlotsConfig,
): Set<string> {
  const result = new Set<string>(manualBlocked);
  if (!config.enabled || !config.slots.length) {
    for (const b of bookings) result.add(b.event_date);
    return result;
  }
  const byDate = new Map<string, BookingRow[]>();
  for (const b of bookings) {
    const d = b.event_date;
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d)!.push(b);
  }
  const slotKeys = config.slots.map((s) => s.key);
  const max = config.maxPerSlot;
  for (const [date, list] of byDate) {
    if (list.some((b) => isWholeDaySlotKey(b.event_slot_key))) {
      result.add(date);
      continue;
    }
    const counts: Record<string, number> = {};
    for (const k of slotKeys) counts[k] = 0;
    for (const b of list) {
      const k = b.event_slot_key!;
      if (k in counts) counts[k] += 1;
    }
    const allFull = slotKeys.every((k) => counts[k] >= max);
    if (allFull) result.add(date);
  }
  return result;
}

export async function slotAvailabilityForDate(
  supabase: SupabaseClient,
  dateStr: string,
  config: BookingSlotsConfig,
): Promise<{ key: string; label: string; timeLabel: string; available: boolean; booked: number; max: number }[]> {
  if (!config.enabled || !config.slots.length) {
    return config.slots.map((s) => ({ ...s, available: true, booked: 0, max: config.maxPerSlot }));
  }

  const { listVenueHalls, loadCalendarBlocks } = await import("@/lib/booking-halls");
  const {
    isDateFullyManuallyBlocked,
    loadActiveDateHolds,
    mergeCalendarBlocks,
    slotHoldCountsByDate,
  } = await import("@/lib/public-calendar-availability");
  const halls = await listVenueHalls(supabase);
  const holds = await loadActiveDateHolds(supabase, dateStr, dateStr);
  const holdBlocks = holds
    .filter((h) => isWholeDaySlotKey(h.event_slot_key))
    .map((h) => ({ date: h.date, space_id: h.space_id }));
  const blocks = mergeCalendarBlocks(await loadCalendarBlocks(supabase, dateStr, dateStr), holdBlocks);
  if (isDateFullyManuallyBlocked(blocks, dateStr, halls.map((h) => h.id))) {
    return config.slots.map((s) => ({
      ...s,
      available: false,
      booked: config.maxPerSlot,
      max: config.maxPerSlot,
    }));
  }

  const { hasWholeDay, counts } = await getSlotCountsForDate(supabase, dateStr);
  if (hasWholeDay) {
    return config.slots.map((s) => ({
      ...s,
      available: false,
      booked: config.maxPerSlot,
      max: config.maxPerSlot,
    }));
  }

  const holdCounts = slotHoldCountsByDate(holds).get(dateStr) ?? {};
  return config.slots.map((s) => {
    const booked = (counts[s.key] ?? 0) + (holdCounts[s.key] ?? 0);
    return {
      ...s,
      booked,
      max: config.maxPerSlot,
      available: booked < config.maxPerSlot,
    };
  });
}

/** Public contact: date has at least one bookable slot, or whole-venue day is free. */
export async function isDateOpenForPublicEnquiry(
  supabase: SupabaseClient,
  dateStr: string,
  config: BookingSlotsConfig,
): Promise<boolean> {
  const { listVenueHalls, loadCalendarBlocks } = await import("@/lib/booking-halls");
  const {
    isDateOpenForPublicEnquiryHalls,
    loadActiveDateHolds,
    mergeCalendarBlocks,
    slotHoldCountsByDate,
  } = await import("@/lib/public-calendar-availability");
  const halls = await listVenueHalls(supabase);
  const holds = await loadActiveDateHolds(supabase, dateStr, dateStr);
  const holdBlocks = holds
    .filter((h) => isWholeDaySlotKey(h.event_slot_key))
    .map((h) => ({ date: h.date, space_id: h.space_id }));
  const blocks = mergeCalendarBlocks(await loadCalendarBlocks(supabase, dateStr, dateStr), holdBlocks);
  const slotHolds = slotHoldCountsByDate(holds).get(dateStr) ?? {};
  return isDateOpenForPublicEnquiryHalls(
    supabase,
    dateStr,
    config,
    blocks,
    halls.map((h) => h.id),
    slotHolds,
  );
}

/** Next N calendar days (from start) that are open for an enquiry. */
export async function nextOpenDatesForPublic(
  supabase: SupabaseClient,
  config: BookingSlotsConfig,
  startDateStr: string,
  limit: number,
  maxScanDays: number,
): Promise<string[]> {
  const out: string[] = [];
  const [y, m, d] = startDateStr.split("-").map(Number);
  const cursor = new Date(y, m - 1, d);
  for (let i = 0; i < maxScanDays && out.length < limit; i++) {
    const ds = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    if (await isDateOpenForPublicEnquiry(supabase, ds, config)) out.push(ds);
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

/** Count bookings per slot for a date, optionally excluding one booking (e.g. PATCH). */
export async function getSlotCountsForDate(
  supabase: SupabaseClient,
  dateStr: string,
  excludeBookingId?: string,
): Promise<{ hasWholeDay: boolean; counts: Record<string, number> }> {
  const { data: rows } = await supabase
    .from("bookings")
    .select("id, event_slot_key")
    .eq("event_date", dateStr)
    .in("status", ["pending", "confirmed", "completed"]);
  const list = (rows ?? []).filter((b) => !excludeBookingId || b.id !== excludeBookingId);
  let hasWholeDay = false;
  const counts: Record<string, number> = {};
  for (const b of list) {
    const k = b.event_slot_key;
    if (isWholeDaySlotKey(k as string | null)) {
      hasWholeDay = true;
      break;
    }
    counts[k as string] = (counts[k as string] ?? 0) + 1;
  }
  return { hasWholeDay, counts };
}

export async function assertSlotBookable(
  supabase: SupabaseClient,
  dateStr: string,
  slotKey: string | null | undefined,
  config: BookingSlotsConfig,
  excludeBookingId?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!config.enabled || !config.slots.length) return { ok: true };
  const key = typeof slotKey === "string" ? slotKey.trim() : "";
  if (!key) return { ok: false, error: "Choose a time slot for this date." };
  if (!config.slots.some((s) => s.key === key)) return { ok: false, error: "Invalid time slot." };

  const { listVenueHalls, loadCalendarBlocks } = await import("@/lib/booking-halls");
  const { isDateFullyManuallyBlocked, loadActiveDateHoldsAsBlocks, mergeCalendarBlocks } = await import(
    "@/lib/public-calendar-availability"
  );
  const halls = await listVenueHalls(supabase);
  const blocks = mergeCalendarBlocks(
    await loadCalendarBlocks(supabase, dateStr, dateStr),
    await loadActiveDateHoldsAsBlocks(supabase, dateStr, dateStr),
  );
  if (isDateFullyManuallyBlocked(blocks, dateStr, halls.map((h) => h.id))) {
    return { ok: false, error: "That date is closed on the venue calendar." };
  }

  const { hasWholeDay, counts } = await getSlotCountsForDate(supabase, dateStr, excludeBookingId);
  if (hasWholeDay) return { ok: false, error: "That date is booked as a full-day event." };
  const booked = counts[key] ?? 0;
  if (booked >= config.maxPerSlot) return { ok: false, error: "That time slot is no longer available." };
  return { ok: true };
}

/** Admin / enquiry preview: per-slot availability for one date, optional exclude booking when editing. */
export async function adminAvailabilityForDate(
  supabase: SupabaseClient,
  dateStr: string,
  config: BookingSlotsConfig,
  excludeBookingId?: string | null,
): Promise<{
  dateManuallyBlocked: boolean;
  slotsEnabled: boolean;
  wholeDayMode: boolean;
  hasWholeDayBooking: boolean;
  slots: { key: string; label: string; timeLabel: string; available: boolean; booked: number; max: number }[];
  dateFullyBooked: boolean;
  availableSlotKeys: string[];
  advisories: string[];
}> {
  const advisories: string[] = [];
  const { listVenueHalls, loadCalendarBlocks, isHallBlockedOnDate } = await import("@/lib/booking-halls");
  const {
    isDateFullyManuallyBlocked,
    isDatePartiallyManuallyBlocked,
    loadActiveDateHoldsAsBlocks,
    mergeCalendarBlocks,
  } = await import("@/lib/public-calendar-availability");
  const halls = await listVenueHalls(supabase);
  const allHallIds = halls.map((h) => h.id);
  const blocks = mergeCalendarBlocks(
    await loadCalendarBlocks(supabase, dateStr, dateStr),
    await loadActiveDateHoldsAsBlocks(supabase, dateStr, dateStr),
  );

  if (isDateFullyManuallyBlocked(blocks, dateStr, allHallIds)) {
    advisories.push("This date is fully blocked on the venue calendar (whole venue or all halls).");
    return {
      dateManuallyBlocked: true,
      slotsEnabled: !!(config.enabled && config.slots.length),
      wholeDayMode: !(config.enabled && config.slots.length),
      hasWholeDayBooking: false,
      slots: [],
      dateFullyBooked: true,
      availableSlotKeys: [],
      advisories,
    };
  }
  if (isDatePartiallyManuallyBlocked(blocks, dateStr, allHallIds)) {
    const closed = halls.filter((h) => isHallBlockedOnDate(blocks, dateStr, h.id)).map((h) => h.name);
    if (closed.length) {
      advisories.push(`Some halls are closed: ${closed.join(", ")}. Other halls may still be available.`);
    }
  }

  if (!config.enabled || !config.slots.length) {
    const { data: rows } = await supabase
      .from("bookings")
      .select("id")
      .eq("event_date", dateStr)
      .in("status", ["pending", "confirmed", "completed"]);
    const list = (rows ?? []).filter((b) => !excludeBookingId || b.id !== excludeBookingId);
    const taken = list.length > 0;
    if (taken) advisories.push("Whole-venue mode: this date already has a booking. Choose another date.");
    return {
      dateManuallyBlocked: false,
      slotsEnabled: false,
      wholeDayMode: true,
      hasWholeDayBooking: taken,
      slots: [],
      dateFullyBooked: taken,
      availableSlotKeys: taken ? [] : ["whole_day"],
      advisories,
    };
  }

  const { hasWholeDay, counts } = await getSlotCountsForDate(supabase, dateStr, excludeBookingId ?? undefined);
  const max = config.maxPerSlot;
  if (hasWholeDay) {
    advisories.push("This date has a full-venue (whole day) booking — no time slots remain.");
  }
  const slots = config.slots.map((s) => {
    const booked = hasWholeDay ? max : counts[s.key] ?? 0;
    const available = !hasWholeDay && booked < max;
    return { ...s, booked, max, available };
  });
  const availableSlotKeys = slots.filter((s) => s.available).map((s) => s.key);
  const dateFullyBooked = hasWholeDay || availableSlotKeys.length === 0;
  if (dateFullyBooked && !hasWholeDay) {
    advisories.push("Every time slot is fully booked on this date.");
  } else if (!dateFullyBooked && slots.some((s) => !s.available)) {
    advisories.push("Some slots are already taken; available slots are listed below.");
  }
  return {
    dateManuallyBlocked: false,
    slotsEnabled: true,
    wholeDayMode: false,
    hasWholeDayBooking: hasWholeDay,
    slots,
    dateFullyBooked,
    availableSlotKeys,
    advisories,
  };
}

export async function assertWholeDayBookable(
  supabase: SupabaseClient,
  dateStr: string,
  excludeBookingId?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: rows } = await supabase
    .from("bookings")
    .select("id, event_slot_key")
    .eq("event_date", dateStr)
    .in("status", ["pending", "confirmed", "completed"]);
  const list = (rows ?? []).filter((b) => !excludeBookingId || b.id !== excludeBookingId);
  if (list.length === 0) return { ok: true };
  return {
    ok: false,
    error:
      "This date already has booking(s). For multi-slot days, pick a free time slot; for a whole-day booking, choose a date with nothing on it yet.",
  };
}
