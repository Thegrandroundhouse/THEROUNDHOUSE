import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";

/** GET ?date=YYYY-MM-DD — staff note for a calendar day */
export async function GET(request: Request) {
  if (!(await getAuthUserFromRequest(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const date = new URL(request.url).searchParams.get("date")?.slice(0, 10) ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const { data, error } = await supabase.from("calendar_day_notes").select("note, updated_at").eq("date", date).maybeSingle();
  if (error) {
    if (error.message.includes("calendar_day_notes") || error.message.includes("does not exist")) {
      return NextResponse.json({ note: "", updated_at: null, needsMigration: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ note: data?.note ?? "", updated_at: data?.updated_at ?? null });
}

/** PUT { date, note } — save staff note (admin only, not on public calendar) */
export async function PUT(request: Request) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const date = typeof body.date === "string" ? body.date.slice(0, 10) : "";
  const note = typeof body.note === "string" ? body.note.trim() : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  if (!note) {
    await supabase.from("calendar_day_notes").delete().eq("date", date);
    return NextResponse.json({ note: "", updated_at: null });
  }

  const { data, error } = await supabase
    .from("calendar_day_notes")
    .upsert(
      { date, note, updated_at: new Date().toISOString(), updated_by: user.id },
      { onConflict: "date" },
    )
    .select("note, updated_at")
    .single();
  if (error) {
    if (error.message.includes("calendar_day_notes") || error.message.includes("does not exist")) {
      return NextResponse.json(
        { error: "Run migration 048_calendar_day_notes.sql in Supabase." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
