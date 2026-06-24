import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/admin-api";
import { monthBoundsLocal } from "@/lib/local-date";
import { getBookingSlotsConfig } from "@/lib/booking-slots";
import { computePublicMonthAvailability } from "@/lib/public-calendar-availability";

/** Public API: fully booked dates + partial (some halls or slots still available). */
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
  const { fullyBooked, partialDates } = await computePublicMonthAvailability(supabase, startStr, endStr, config);

  return NextResponse.json({
    bookedDates: [...fullyBooked].sort(),
    partialDates: [...partialDates].sort(),
    slotsEnabled: config.enabled && config.slots.length > 0,
    hallAware: true,
  });
}
