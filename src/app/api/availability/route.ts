import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { monthBoundsLocal } from "@/lib/local-date";
import { computeFullyBookedDates, getBookingSlotsConfig } from "@/lib/booking-slots";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/** Public API: fully booked dates + partial (some slots left) when multi-slot mode is on. */
export async function GET(request: NextRequest) {
  const year = request.nextUrl.searchParams.get("year");
  const month = request.nextUrl.searchParams.get("month");
  const y = year ? parseInt(year, 10) : new Date().getFullYear();
  const m = month !== null && month !== undefined ? parseInt(month, 10) : new Date().getMonth();
  if (Number.isNaN(y) || Number.isNaN(m)) {
    return NextResponse.json({ bookedDates: [], partialDates: [] as string[] });
  }
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ bookedDates: [], partialDates: [] as string[] });

  const { start: startStr, end: endStr } = monthBoundsLocal(y, m);

  const config = await getBookingSlotsConfig(supabase);

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("event_date, event_slot_key")
    .in("status", ["pending", "confirmed", "completed"])
    .gte("event_date", startStr)
    .lte("event_date", endStr);

  if (error) return NextResponse.json({ bookedDates: [], partialDates: [] as string[] });

  const bookingRows = (bookings ?? []).map((b) => ({
    event_date: b.event_date as string,
    event_slot_key: (b.event_slot_key as string | null) ?? null,
  }));

  const { data: blocked } = await supabase
    .from("venue_calendar")
    .select("date")
    .gte("date", startStr)
    .lte("date", endStr)
    .eq("is_booked", true);

  const manualBlocked = new Set((blocked ?? []).map((r) => r.date as string));
  const fullyBooked = computeFullyBookedDates(bookingRows, manualBlocked, config);

  const datesWithAnyBooking = new Set(bookingRows.map((b) => b.event_date));
  const partialDates: string[] = [];
  if (config.enabled && config.slots.length) {
    for (const d of datesWithAnyBooking) {
      if (!fullyBooked.has(d) && !manualBlocked.has(d)) partialDates.push(d);
    }
    partialDates.sort();
  }

  return NextResponse.json({
    bookedDates: [...fullyBooked].filter((d) => d >= startStr && d <= endStr).sort(),
    partialDates,
    slotsEnabled: config.enabled && config.slots.length > 0,
  });
}
