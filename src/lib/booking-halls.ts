import type { SupabaseClient } from "@supabase/supabase-js";

export type VenueHall = {
  id: string;
  name: string;
  slug: string;
  capacity: number | null;
  sort_order: number;
};

export type CalendarBlockRow = { date: string; space_id: string | null };

export async function listVenueHalls(supabase: SupabaseClient): Promise<VenueHall[]> {
  const { data } = await supabase
    .from("venue_spaces")
    .select("id, name, slug, capacity, sort_order")
    .order("sort_order");
  return (data ?? []) as VenueHall[];
}

/** Empty = whole venue / all halls (legacy bookings). */
export async function getBookingHallIds(supabase: SupabaseClient, bookingId: string): Promise<string[]> {
  const { data } = await supabase.from("booking_spaces").select("space_id").eq("booking_id", bookingId);
  const ids = (data ?? []).map((r) => r.space_id as string).filter(Boolean);
  if (ids.length) return ids;
  const { data: b } = await supabase.from("bookings").select("space_id").eq("id", bookingId).maybeSingle();
  if (b?.space_id) return [b.space_id as string];
  return [];
}

export async function setBookingHalls(
  supabase: SupabaseClient,
  bookingId: string,
  spaceIds: string[],
): Promise<void> {
  const unique = [...new Set(spaceIds.filter(Boolean))];
  await supabase.from("booking_spaces").delete().eq("booking_id", bookingId);
  if (unique.length) {
    await supabase.from("booking_spaces").insert(unique.map((space_id) => ({ booking_id: bookingId, space_id })));
    await supabase.from("bookings").update({ space_id: unique.length === 1 ? unique[0] : null }).eq("id", bookingId);
  } else {
    await supabase.from("bookings").update({ space_id: null }).eq("id", bookingId);
  }
}

export function hallsOverlap(a: string[] | null, b: string[] | null): boolean {
  const left = a && a.length ? a : null;
  const right = b && b.length ? b : null;
  if (!left || !right) return true;
  return left.some((id) => right.includes(id));
}

export function hallNamesLabel(halls: VenueHall[], ids: string[]): string {
  if (!ids.length) return "Whole venue (all halls)";
  const names = ids.map((id) => halls.find((h) => h.id === id)?.name).filter(Boolean);
  return names.length ? names.join(" + ") : "Whole venue";
}

export async function loadCalendarBlocks(
  supabase: SupabaseClient,
  start: string,
  end: string,
): Promise<CalendarBlockRow[]> {
  const { data } = await supabase
    .from("venue_calendar")
    .select("date, space_id")
    .gte("date", start)
    .lte("date", end)
    .eq("is_booked", true)
    .is("booking_id", null);
  return (data ?? []).map((r) => ({
    date: r.date as string,
    space_id: (r.space_id as string | null) ?? null,
  }));
}

export function manualBlockedDatesForFilter(
  blocks: CalendarBlockRow[],
  hallFilter: string | "all" | "whole",
  allHallIds: string[],
): Set<string> {
  const dates = new Set<string>();
  for (const b of blocks) {
    if (b.space_id == null) dates.add(b.date);
  }
  if (hallFilter === "whole") {
    return new Set([...dates]);
  }
  if (hallFilter === "all") {
    if (!allHallIds.length) return dates;
    const byDate = new Map<string, Set<string>>();
    for (const b of blocks) {
      if (b.space_id == null) continue;
      if (!byDate.has(b.date)) byDate.set(b.date, new Set());
      byDate.get(b.date)!.add(b.space_id);
    }
    for (const [date, set] of byDate) {
      if (allHallIds.every((id) => set.has(id))) dates.add(date);
    }
    return dates;
  }
  for (const b of blocks) {
    if (b.space_id === hallFilter) dates.add(b.date);
  }
  if (dates.size === 0 && blocks.some((b) => b.date && b.space_id == null)) {
    for (const b of blocks) {
      if (b.space_id == null) dates.add(b.date);
    }
  }
  return dates;
}

type BookingHallRow = { id: string; event_date: string; event_slot_key: string | null; hallIds: string[] };

export async function loadBookingsWithHalls(
  supabase: SupabaseClient,
  start: string,
  end: string,
): Promise<BookingHallRow[]> {
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, event_date, event_slot_key, space_id")
    .gte("event_date", start)
    .lte("event_date", end)
    .in("status", ["pending", "confirmed", "completed"]);
  if (!bookings?.length) return [];
  const ids = bookings.map((b) => b.id as string);
  const { data: links } = await supabase.from("booking_spaces").select("booking_id, space_id").in("booking_id", ids);
  const map = new Map<string, string[]>();
  for (const row of links ?? []) {
    const bid = row.booking_id as string;
    if (!map.has(bid)) map.set(bid, []);
    map.get(bid)!.push(row.space_id as string);
  }
  return bookings.map((b) => {
    const linked = map.get(b.id as string) ?? [];
    const legacy = b.space_id ? [b.space_id as string] : [];
    return {
      id: b.id as string,
      event_date: b.event_date as string,
      event_slot_key: (b.event_slot_key as string | null) ?? null,
      hallIds: linked.length ? linked : legacy,
    };
  });
}

export function bookingsForHallFilter(
  rows: BookingHallRow[],
  date: string,
  hallFilter: string | "all" | "whole",
): BookingHallRow[] {
  const day = rows.filter((r) => r.event_date === date);
  if (hallFilter === "all" || hallFilter === "whole") return day;
  return day.filter((r) => hallsOverlap(r.hallIds.length ? r.hallIds : null, [hallFilter]));
}

export async function upsertCalendarBlock(
  supabase: SupabaseClient,
  date: string,
  spaceId: string | null,
): Promise<{ ok: boolean; error?: string }> {
  let del = supabase.from("venue_calendar").delete().eq("date", date).is("booking_id", null);
  if (spaceId) del = del.eq("space_id", spaceId);
  else del = del.is("space_id", null);
  await del;
  const { error } = await supabase.from("venue_calendar").insert({
    date,
    space_id: spaceId,
    is_booked: true,
    booking_id: null,
    updated_at: new Date().toISOString(),
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function removeCalendarBlock(
  supabase: SupabaseClient,
  date: string,
  spaceId: string | null,
): Promise<void> {
  let q = supabase.from("venue_calendar").delete().eq("date", date).is("booking_id", null);
  if (spaceId) q = q.eq("space_id", spaceId);
  else q = q.is("space_id", null);
  await q;
}
