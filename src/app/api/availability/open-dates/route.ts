import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/admin-api";
import { getBookingSlotsConfig, isWholeDaySlotKey } from "@/lib/booking-slots";
import {
  isDateOpenForPublicEnquiryHalls,
  loadActiveDateHolds,
  mergeCalendarBlocks,
  slotHoldCountsByDate,
} from "@/lib/public-calendar-availability";
import { listVenueHalls, loadCalendarBlocks } from "@/lib/booking-halls";

/** Public: next dates that still accept enquiries (hall-aware blocks + slot capacity). */
export async function GET(request: Request) {
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ dates: [] });
  const url = new URL(request.url);
  const limit = Math.min(16, Math.max(1, parseInt(url.searchParams.get("limit") || "10", 10) || 10));
  const today = new Date();
  const start = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const config = await getBookingSlotsConfig(supabase);
  const halls = await listVenueHalls(supabase);
  const allHallIds = halls.map((h) => h.id);

  const out: string[] = [];
  const [y, m, d] = start.split("-").map(Number);
  const cursor = new Date(y, m - 1, d);
  for (let i = 0; i < 400 && out.length < limit; i++) {
    const ds = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    const [manualBlocks, holds] = await Promise.all([
      loadCalendarBlocks(supabase, ds, ds),
      loadActiveDateHolds(supabase, ds, ds),
    ]);
    const holdBlocks = holds
      .filter((h) => isWholeDaySlotKey(h.event_slot_key))
      .map((h) => ({ date: h.date, space_id: h.space_id }));
    const blocks = mergeCalendarBlocks(manualBlocks, holdBlocks);
    const slotHolds = slotHoldCountsByDate(holds).get(ds) ?? {};
    if (await isDateOpenForPublicEnquiryHalls(supabase, ds, config, blocks, allHallIds, slotHolds)) {
      out.push(ds);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return NextResponse.json({ dates: out });
}
