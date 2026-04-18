import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-api";

/** Calendar date in Europe/London (venue TZ). */
function todayLondonYYYYMMDD() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });
}

/**
 * Create one "Event day" reminder per booking whose event is today (UK),
 * if not already present. Call from reminders page on load.
 */
export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  const { user, supabase } = auth;
  const day = todayLondonYYYYMMDD();

  const { data: bookings, error: bErr } = await supabase
    .from("bookings")
    .select("id, booking_code, client_name, event_date, status")
    .eq("event_date", day)
    .in("status", ["pending", "confirmed"]);
  if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 });

  let created = 0;
  for (const b of bookings || []) {
    const { data: existing } = await supabase
      .from("reminders")
      .select("id")
      .eq("booking_id", b.id)
      .ilike("title", "Event day%")
      .limit(1)
      .maybeSingle();
    if (existing) continue;

    const remindAt = `${day}T08:00:00+00:00`;
    const { error: insErr } = await supabase.from("reminders").insert({
      created_by: user.id,
      title: `Event day — ${(b.booking_code as string) || "Booking"}`,
      body: `Event date is today for ${(b.client_name as string) || "client"}.`,
      remind_at: remindAt,
      booking_id: b.id,
      done: false,
      updated_at: new Date().toISOString(),
    });
    if (!insErr) created += 1;
  }

  return NextResponse.json({ ok: true, date: day, checked: (bookings || []).length, created });
}
