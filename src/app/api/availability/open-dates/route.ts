import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/admin-api";
import { getBookingSlotsConfig, nextOpenDatesForPublic } from "@/lib/booking-slots";

/** Public: next dates that still accept enquiries (not calendar-blocked, has slot or whole day free). */
export async function GET(request: NextRequest) {
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ dates: [] });
  const limit = Math.min(16, Math.max(1, parseInt(request.nextUrl.searchParams.get("limit") || "10", 10) || 10));
  const today = new Date();
  const start = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const config = await getBookingSlotsConfig(supabase);
  const dates = await nextOpenDatesForPublic(supabase, config, start, limit, 400);
  return NextResponse.json({ dates });
}
