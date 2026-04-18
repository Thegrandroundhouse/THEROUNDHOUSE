import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function parseISODate(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s + "T12:00:00");
  return Number.isNaN(d.getTime()) ? null : d;
}

function enumerateDates(from: string, to: string): string[] {
  const a = parseISODate(from);
  const b = parseISODate(to);
  if (!a || !b || a > b) return [from];
  const out: string[] = [];
  const cur = new Date(a);
  while (cur <= b) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/**
 * POST body: { date: "YYYY-MM-DD", action: "block" | "unblock", endDate?: "YYYY-MM-DD" (inclusive) }
 * Range: blocks or unblocks each day; block skips days that already have a booking event.
 */
export async function POST(request: Request) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const date = String(body.date || "").slice(0, 10);
  const endDate = body.endDate ? String(body.endDate).slice(0, 10) : date;
  const action = body.action === "unblock" ? "unblock" : "block";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return NextResponse.json({ error: "Invalid endDate" }, { status: 400 });
  }

  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const dates = enumerateDates(date, endDate);
  if (dates.length > 366) {
    return NextResponse.json({ error: "Range too large (max ~1 year)" }, { status: 400 });
  }

  const results: { date: string; ok: boolean; skip?: string }[] = [];

  if (action === "block") {
    const { data: bookingRows } = await supabase
      .from("bookings")
      .select("event_date")
      .in("event_date", dates)
      .in("status", ["pending", "confirmed", "completed"]);
    const bookedSet = new Set((bookingRows ?? []).map((r) => r.event_date as string));

    for (const d of dates) {
      if (bookedSet.has(d)) {
        results.push({ date: d, ok: false, skip: "has_booking" });
        continue;
      }
      const { error } = await supabase.from("venue_calendar").upsert(
        {
          date: d,
          is_booked: true,
          booking_id: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "date" }
      );
      results.push({ date: d, ok: !error });
      if (error) results[results.length - 1].skip = error.message;
    }
    return NextResponse.json({ ok: true, action: "block", results, dates: dates.length });
  }

  for (const d of dates) {
    const { data: row } = await supabase.from("venue_calendar").select("booking_id").eq("date", d).maybeSingle();
    if (row?.booking_id) {
      results.push({ date: d, ok: false, skip: "linked_booking" });
      continue;
    }
    await supabase.from("venue_calendar").delete().eq("date", d);
    results.push({ date: d, ok: true });
  }
  return NextResponse.json({ ok: true, action: "unblock", results, dates: dates.length });
}
