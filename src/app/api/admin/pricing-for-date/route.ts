import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";

export async function GET(request: Request) {
  if (!(await getAuthUserFromRequest(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date");
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return NextResponse.json({ error: "Valid date (YYYY-MM-DD) required" }, { status: 400 });
  }
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const { data: dayRow } = await supabase
    .from("venue_day_pricing")
    .select("suggested_total_cents, note")
    .eq("event_date", dateStr)
    .maybeSingle();

  if (dayRow?.suggested_total_cents != null) {
    return NextResponse.json({
      source: "day_override",
      suggested_total_cents: dayRow.suggested_total_cents,
      note: dayRow.note ?? null,
      band: null,
    });
  }

  const { data: seasons } = await supabase
    .from("venue_season_pricing")
    .select("id, name, suggested_total_cents, date_start, date_end")
    .eq("active", true)
    .lte("date_start", dateStr)
    .gte("date_end", dateStr)
    .order("date_start", { ascending: false })
    .limit(1);

  const band = seasons?.[0] ?? null;
  if (band?.suggested_total_cents != null) {
    return NextResponse.json({
      source: "season",
      suggested_total_cents: band.suggested_total_cents,
      band: { id: band.id, name: band.name, date_start: band.date_start, date_end: band.date_end },
    });
  }

  return NextResponse.json({
    source: null,
    suggested_total_cents: null,
    band: null,
  });
}
