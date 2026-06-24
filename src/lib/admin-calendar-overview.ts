import type { SupabaseClient } from "@supabase/supabase-js";
import { getBookingSlotsConfig } from "@/lib/booking-slots";
import {
  hallNamesLabel,
  loadCalendarBlocks,
  listVenueHalls,
  type CalendarBlockRow,
  type VenueHall,
} from "@/lib/booking-halls";

export type CalendarBookingItem = {
  id: string;
  client_name: string | null;
  client_email: string;
  status: string;
  package_name: string | null;
  event_type: string | null;
  event_slot_key: string | null;
  event_slot_label: string;
  hall_ids: string[];
  hall_label: string;
};

export type CalendarOverviewPayload = {
  start: string;
  end: string;
  halls: VenueHall[];
  bookingsByDate: Record<string, CalendarBookingItem[]>;
  manualBlocks: CalendarBlockRow[];
  manualBlockedDates: string[];
};

export async function loadCalendarOverview(
  supabase: SupabaseClient,
  start: string,
  end: string,
): Promise<CalendarOverviewPayload> {
  const slotConfig = await getBookingSlotsConfig(supabase);
  const slotLabel = (key: string | null) => {
    if (key == null || String(key).trim() === "") return "Full day";
    const s = slotConfig.slots.find((x) => x.key === key);
    return s ? `${s.label}${s.timeLabel ? ` · ${s.timeLabel}` : ""}` : key;
  };

  const [halls, manualBlocks, { data: bookingsRaw }] = await Promise.all([
    listVenueHalls(supabase),
    loadCalendarBlocks(supabase, start, end),
    supabase
      .from("bookings")
      .select("id, event_date, event_slot_key, client_name, client_email, status, package_name, event_type, space_id")
      .gte("event_date", start)
      .lte("event_date", end)
      .neq("status", "draft"),
  ]);

  const bookingList = bookingsRaw ?? [];
  const ids = bookingList.map((b) => b.id as string);
  const hallMap = new Map<string, string[]>();
  if (ids.length) {
    const { data: links } = await supabase.from("booking_spaces").select("booking_id, space_id").in("booking_id", ids);
    for (const row of links ?? []) {
      const bid = row.booking_id as string;
      if (!hallMap.has(bid)) hallMap.set(bid, []);
      hallMap.get(bid)!.push(row.space_id as string);
    }
    for (const b of bookingList) {
      const bid = b.id as string;
      if (!hallMap.has(bid) || hallMap.get(bid)!.length === 0) {
        const legacy = b.space_id ? [b.space_id as string] : [];
        if (legacy.length) hallMap.set(bid, legacy);
      }
    }
  }

  const bookingsByDate: Record<string, CalendarBookingItem[]> = {};

  for (const b of bookingList) {
    const d = b.event_date as string;
    const hallIds = hallMap.get(b.id as string) ?? [];
    if (!bookingsByDate[d]) bookingsByDate[d] = [];
    bookingsByDate[d].push({
      id: b.id as string,
      client_name: b.client_name as string | null,
      client_email: b.client_email as string,
      status: b.status as string,
      package_name: (b.package_name as string | null) ?? null,
      event_type: (b.event_type as string | null) ?? null,
      event_slot_key: (b.event_slot_key as string | null) ?? null,
      event_slot_label: slotLabel((b.event_slot_key as string | null) ?? null),
      hall_ids: hallIds,
      hall_label: hallNamesLabel(halls, hallIds),
    });
  }

  const manualBlockedDates = [...new Set(manualBlocks.map((r) => r.date))];

  return {
    start,
    end,
    halls,
    bookingsByDate,
    manualBlocks,
    manualBlockedDates,
  };
}
