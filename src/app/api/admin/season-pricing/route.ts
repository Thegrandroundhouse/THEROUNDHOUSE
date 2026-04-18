import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";

export async function GET(request: Request) {
  if (!(await getAuthUserFromRequest(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const { data, error } = await supabase.from("venue_season_pricing").select("*").order("date_start", { ascending: true });
  if (error) {
    if (error.code === "42P01" || error.message.includes("venue_season"))
      return NextResponse.json({ rows: [], needsMigration: true });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  if (!(await getAuthUserFromRequest(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const { data, error } = await supabase
    .from("venue_season_pricing")
    .insert({
      name: String(body.name || "Season"),
      date_start: body.date_start,
      date_end: body.date_end,
      suggested_total_cents: body.suggested_total_cents ?? null,
      note: body.note || null,
      sort_order: body.sort_order ?? 0,
      active: body.active !== false,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
