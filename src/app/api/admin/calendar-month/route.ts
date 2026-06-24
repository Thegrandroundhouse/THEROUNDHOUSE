import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getBookingSlotsConfig } from "@/lib/booking-slots";
import { monthBoundsLocal } from "@/lib/local-date";
import {
  hallNamesLabel,
  loadBookingsWithHalls,
  loadCalendarBlocks,
  listVenueHalls,
} from "@/lib/booking-halls";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/** GET: month overview — bookings per date, manual blocks, halls */
export async function GET(request: NextRequest) {
  const authUser = await getAuthUserFromRequest(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const y = parseInt(request.nextUrl.searchParams.get("year") || String(new Date().getFullYear()), 10);
  const m = parseInt(request.nextUrl.searchParams.get("month") || String(new Date().getMonth()), 10);
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const { start, end } = monthBoundsLocal(y, m);

  const slotConfig = await getBookingSlotsConfig(supabase);
  const slotLabel = (key: string | null) => {
    if (key == null || String(key).trim() === "") return "Full day";
    const s = slotConfig.slots.find((x) => x.key === key);
    return s ? `${s.label}${s.timeLabel ? ` · ${s.timeLabel}` : ""}` : key;
  };

  const [halls, bookingRows, manualBlocks, { data: bookingsRaw }] = await Promise.all([
    listVenueHalls(supabase),
    loadBookingsWithHalls(supabase, start, end),
    loadCalendarBlocks(supabase, start, end),
    supabase
      .from("bookings")
      .select("id, event_date, event_slot_key, client_name, client_email, status, package_name, event_type")
      .gte("event_date", start)
      .lte("event_date", end)
      .in("status", ["pending", "confirmed", "completed"]),
  ]);

  const hallMap = new Map(bookingRows.map((r) => [r.id, r.hallIds]));

  const bookingsByDate: Record<
    string,
    {
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
    }[]
  > = {};

  for (const b of bookingsRaw ?? []) {
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

  return NextResponse.json({
    year: y,
    month: m,
    start,
    end,
    halls,
    bookingsByDate,
    manualBlocks,
    manualBlockedDates,
  });
}
