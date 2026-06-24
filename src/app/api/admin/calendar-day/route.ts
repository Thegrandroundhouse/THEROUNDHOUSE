import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { enumerateLocalDates } from "@/lib/local-date";
import {
  hallsOverlap,
  loadBookingsWithHalls,
  removeCalendarBlock,
  upsertCalendarBlock,
} from "@/lib/booking-halls";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * POST body: {
 *   date: "YYYY-MM-DD",
 *   action: "block" | "unblock",
 *   endDate?: "YYYY-MM-DD",
 *   space_id?: string | null  — null/omit = whole venue; UUID = one hall
 * }
 */
export async function POST(request: Request) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const date = String(body.date || "").slice(0, 10);
  const endDate = body.endDate ? String(body.endDate).slice(0, 10) : date;
  const action = body.action === "unblock" ? "unblock" : "block";
  const spaceId =
    body.space_id === null || body.space_id === undefined || body.space_id === ""
      ? null
      : String(body.space_id);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return NextResponse.json({ error: "Invalid endDate" }, { status: 400 });
  }

  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const dates = enumerateLocalDates(date, endDate);
  if (dates.length > 366) {
    return NextResponse.json({ error: "Range too large (max ~1 year)" }, { status: 400 });
  }

  const results: { date: string; ok: boolean; skip?: string }[] = [];

  if (action === "block") {
    const bookings = await loadBookingsWithHalls(supabase, dates[0], dates[dates.length - 1]);

    for (const d of dates) {
      const dayBookings = bookings.filter((b) => b.event_date === d);
      const hasConflict = spaceId
        ? dayBookings.some((b) => hallsOverlap(b.hallIds.length ? b.hallIds : null, [spaceId]))
        : dayBookings.length > 0;
      if (hasConflict) {
        results.push({ date: d, ok: false, skip: "has_booking" });
        continue;
      }
      const res = await upsertCalendarBlock(supabase, d, spaceId, typeof body.block_note === "string" ? body.block_note : undefined);
      results.push({ date: d, ok: res.ok, skip: res.error });
    }
    return NextResponse.json({ ok: true, action: "block", results, dates: dates.length, space_id: spaceId });
  }

  for (const d of dates) {
    await removeCalendarBlock(supabase, d, spaceId);
    results.push({ date: d, ok: true });
  }
  return NextResponse.json({ ok: true, action: "unblock", results, dates: dates.length, space_id: spaceId });
}
