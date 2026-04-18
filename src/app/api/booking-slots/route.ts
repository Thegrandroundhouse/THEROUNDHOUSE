import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getBookingSlotsConfig, getSlotCountsForDate, slotAvailabilityForDate } from "@/lib/booking-slots";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/** Public: availability per slot for one date (contact page). */
export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ enabled: false, slots: [] });
  const config = await getBookingSlotsConfig(supabase);
  if (!config.enabled || !config.slots.length) {
    return NextResponse.json({
      enabled: false,
      maxPerSlot: 1,
      slots: [],
      dateFullyBooked: false,
    });
  }
  const slots = await slotAvailabilityForDate(supabase, date, config);
  const dateFullyBooked = slots.every((s) => !s.available);
  const { hasWholeDay, counts } = await getSlotCountsForDate(supabase, date);
  const anySlotBooking = Object.values(counts).some((n) => n > 0);
  /* Full venue (whole day) only if nothing on that date yet — same as assertWholeDayBookable. */
  const wholeDayAvailable =
    config.allowWholeDay !== false && !hasWholeDay && !anySlotBooking;
  return NextResponse.json({
    enabled: true,
    maxPerSlot: config.maxPerSlot,
    slots,
    dateFullyBooked,
    wholeDayAvailable,
    allowWholeDay: config.allowWholeDay !== false,
    wholeDayLabel: config.wholeDayLabel,
    hasWholeDayBooking: hasWholeDay,
  });
}
