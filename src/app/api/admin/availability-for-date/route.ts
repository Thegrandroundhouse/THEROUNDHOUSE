import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";
import { adminAvailabilityForDate, getBookingSlotsConfig } from "@/lib/booking-slots";

/** Admin: availability + advisories for one date (enquiry / booking editor). */
export async function GET(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const date = request.nextUrl.searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  const excludeBookingId = request.nextUrl.searchParams.get("exclude_booking_id") || undefined;
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const config = await getBookingSlotsConfig(supabase);
  const payload = await adminAvailabilityForDate(supabase, date, config, excludeBookingId);
  return NextResponse.json(payload);
}
