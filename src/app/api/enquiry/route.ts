import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getBookingSlotsConfig } from "@/lib/booking-slots";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/** Public enquiry: always accept valid name+email. Slot is a preference only (capacity checked when creating a booking). */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const name = [body.firstName, body.lastName].filter(Boolean).join(" ") || String(body.name || "").trim();
  const email = String(body.email || "").trim();
  if (!name || !email) {
    return NextResponse.json({ error: "Name and email required" }, { status: 400 });
  }
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const dateStr =
    body.date && /^\d{4}-\d{2}-\d{2}$/.test(String(body.date)) ? String(body.date) : null;
  const ukToday = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });
  if (dateStr && dateStr < ukToday) {
    return NextResponse.json({ error: "Please choose today or a future date." }, { status: 400 });
  }
  const rawSlot = typeof body.event_slot_key === "string" ? body.event_slot_key.trim() : "";

  let event_slot_key: string | null = null;
  if (rawSlot === "whole_day" && dateStr) {
    const cfg = await getBookingSlotsConfig(supabase);
    if (cfg.allowWholeDay !== false) event_slot_key = "whole_day";
  } else if (rawSlot) {
    const cfg = await getBookingSlotsConfig(supabase);
    if (cfg.slots.some((s) => s.key === rawSlot)) {
      event_slot_key = rawSlot;
    }
  }

  const row = {
    name,
    email,
    phone: body.phone != null && String(body.phone).trim() ? String(body.phone).trim() : null,
    function_type: body.typeOfFunction != null && String(body.typeOfFunction).trim() ? String(body.typeOfFunction).trim() : null,
    hear_about: body.whereDidYouHear != null && String(body.whereDidYouHear).trim() ? String(body.whereDidYouHear).trim() : null,
    message: body.message != null && String(body.message).trim() ? String(body.message).trim() : null,
    event_date: dateStr,
    event_slot_key: dateStr ? event_slot_key : null,
  };

  let { error } = await supabase.from("enquiries").insert(row);
  if (error?.message?.includes("event_slot_key") || error?.code === "42703") {
    const { event_slot_key: _omit, ...withoutSlot } = row;
    const retry = await supabase.from("enquiries").insert(withoutSlot);
    error = retry.error;
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
