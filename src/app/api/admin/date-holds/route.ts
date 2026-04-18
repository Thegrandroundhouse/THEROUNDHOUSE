import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";

async function reminderOnHoldPlaced(
  supabase: NonNullable<ReturnType<typeof getAdminClient>>,
  userId: string,
  enquiryId: string,
  expiresAt: string | null,
  holdDate: string,
  slotLabel: string
) {
  if (!expiresAt || !enquiryId) return;
  const { data: enq } = await supabase.from("enquiries").select("name").eq("id", enquiryId).single();
  const name = enq?.name?.trim() || "Lead";
  const { error } = await supabase.from("reminders").insert({
    created_by: userId,
    title: `Hold expires — ${name}`,
    body: `Soft hold on ${holdDate}${slotLabel ? ` (${slotLabel})` : ""} ends; extend, release, or convert to booking.`,
    remind_at: expiresAt,
    enquiry_id: enquiryId,
    updated_at: new Date().toISOString(),
  });
  if (error) console.error("reminderOnHoldPlaced", error.message);
}

export async function GET(request: Request) {
  if (!(await getAuthUserFromRequest(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const enquiryId = url.searchParams.get("enquiry_id");
  let q = supabase.from("date_holds").select("*").is("released_at", null).order("hold_date");
  if (enquiryId) q = q.eq("enquiry_id", enquiryId);
  if (from) q = q.gte("hold_date", from);
  if (to) q = q.lte("hold_date", to);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const hold_date = String(body.hold_date || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(hold_date)) {
    return NextResponse.json({ error: "Valid hold_date (YYYY-MM-DD) required" }, { status: 400 });
  }
  let expires_at: string | null = body.expires_at ?? null;
  if (body.duration_hours != null) {
    const hours = Number(body.duration_hours);
    if (!Number.isFinite(hours) || hours < 0) {
      return NextResponse.json({ error: "duration_hours must be a non-negative number" }, { status: 400 });
    }
    const d = new Date();
    d.setTime(d.getTime() + hours * 60 * 60 * 1000);
    expires_at = d.toISOString();
  }
  const event_slot_key =
    body.event_slot_key != null && String(body.event_slot_key).trim()
      ? String(body.event_slot_key).trim()
      : null;
  const enquiry_id = body.enquiry_id != null && String(body.enquiry_id).trim() ? String(body.enquiry_id).trim() : null;
  const { data, error } = await supabase
    .from("date_holds")
    .insert({
      space_id: body.space_id || null,
      hold_date,
      note: body.note || null,
      expires_at: expires_at || null,
      enquiry_id,
      event_slot_key,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (enquiry_id && expires_at) {
    const slotLabel = event_slot_key ? event_slot_key.replace(/_/g, " ") : "whole day";
    await reminderOnHoldPlaced(supabase, user.id, enquiry_id, expires_at, hold_date, slotLabel);
  }

  return NextResponse.json(data);
}
