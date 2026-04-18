import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";

export async function GET(request: Request) {
  if (!(await getAuthUserFromRequest(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  try {
    const { data, error } = await supabase
      .from("venue_day_pricing")
      .select("*")
      .order("event_date", { ascending: true });
    if (error) {
      if (error.code === "42P01" || error.message?.includes("venue_day")) return NextResponse.json([]);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  if (!(await getAuthUserFromRequest(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const event_date = body.event_date as string;
  if (!event_date || !/^\d{4}-\d{2}-\d{2}$/.test(event_date)) {
    return NextResponse.json({ error: "Valid event_date (YYYY-MM-DD) required" }, { status: 400 });
  }
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const suggested_total_cents = body.suggested_total_cents != null ? Number(body.suggested_total_cents) : null;
  const note = body.note != null ? String(body.note) : null;
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("venue_day_pricing")
    .upsert(
      {
        event_date,
        suggested_total_cents,
        note,
        updated_at: now,
      },
      { onConflict: "event_date" }
    )
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  if (!(await getAuthUserFromRequest(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const event_date = searchParams.get("date");
  if (!event_date || !/^\d{4}-\d{2}-\d{2}$/.test(event_date)) {
    return NextResponse.json({ error: "Valid date (YYYY-MM-DD) required" }, { status: 400 });
  }
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const { error } = await supabase.from("venue_day_pricing").delete().eq("event_date", event_date);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
