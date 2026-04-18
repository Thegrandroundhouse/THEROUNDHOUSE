import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { writeAuditLog } from "@/lib/audit-log";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  const { data, error } = await supabase.from("enquiries").select("*").eq("id", id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: error.code === "PGRST116" ? 404 : 500 });
  return NextResponse.json(data);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  const { data: prev } = await supabase.from("enquiries").select("status, email").eq("id", id).maybeSingle();
  const allowed = ["status", "notes", "follow_up_notes", "last_contact_at", "event_date", "event_slot_key"];
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of allowed) if (body[k] !== undefined) update[k] = body[k];
  if (body.event_slot_key !== undefined) {
    const v = body.event_slot_key;
    if (v === null || v === "") update.event_slot_key = null;
    else if (v === "whole_day") update.event_slot_key = "whole_day";
    else update.event_slot_key = String(v).trim() || null;
  }
  if (body.event_date !== undefined) {
    update.event_date = body.event_date === "" || body.event_date == null ? null : String(body.event_date).slice(0, 10);
  }
  if (body.status !== undefined && body.last_contact_at === undefined) {
    update.last_contact_at = new Date().toISOString();
  }
  if (body.mark_contacted_now) {
    update.last_contact_at = new Date().toISOString();
  }
  const { data, error } = await supabase
    .from("enquiries")
    .update(update)
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writeAuditLog(supabase, user, {
    action: "update",
    entity_type: "enquiry",
    entity_id: id,
    summary: `Enquiry ${prev?.email || id} → status ${data.status}`,
    payload_before: prev ? { status: prev.status } : null,
    payload_after: { status: data.status },
  });
  return NextResponse.json(data);
}
