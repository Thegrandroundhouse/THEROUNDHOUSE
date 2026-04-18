import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { writeAuditLog } from "@/lib/audit-log";
import {
  assertSlotBookable,
  assertWholeDayBookable,
  getBookingSlotsConfig,
} from "@/lib/booking-slots";
import {
  BOOKING_COMPLETED_FUTURE_EVENT_MESSAGE,
  isEventDateInFutureLondon,
} from "@/lib/booking-status-rules";

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
  const { data, error } = await supabase.from("bookings").select("*").eq("id", id).single();
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
  const { data: before } = await supabase.from("bookings").select("*").eq("id", id).maybeSingle();
  const allowed = [
    "client_name", "client_email", "client_phone", "event_date", "event_type",
    "package_name", "package_id", "status", "total_cents", "deposit_cents", "balance_cents",
    "special_requirements", "notes", "extras",
  ];
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of allowed) if (body[k] !== undefined) update[k] = body[k];

  const slotConfig = await getBookingSlotsConfig(supabase);
  const nextDate = String(
    body.event_date !== undefined ? body.event_date : before?.event_date || "",
  ).slice(0, 10);
  let nextSlot: string | null =
    before?.event_slot_key != null && String(before.event_slot_key).trim() !== ""
      ? String(before.event_slot_key)
      : null;
  if (body.event_slot_key !== undefined) {
    const v = body.event_slot_key;
    nextSlot =
      v === null || v === "" || v === "whole_day" || (typeof v === "string" && v.trim() === "")
        ? null
        : String(v).trim();
  }
  const dateChanged = body.event_date !== undefined && body.event_date !== before?.event_date;
  const slotInBody = body.event_slot_key !== undefined;

  if (update.status === "completed") {
    const ev = /^\d{4}-\d{2}-\d{2}$/.test(nextDate)
      ? nextDate
      : String(before?.event_date ?? "").slice(0, 10);
    if (ev && /^\d{4}-\d{2}-\d{2}$/.test(ev) && isEventDateInFutureLondon(ev)) {
      return NextResponse.json({ error: BOOKING_COMPLETED_FUTURE_EVENT_MESSAGE }, { status: 400 });
    }
  }

  if (before && nextDate && (dateChanged || slotInBody)) {
    if (slotConfig.enabled && slotConfig.slots.length) {
      if (nextSlot == null) {
        const w = await assertWholeDayBookable(supabase, nextDate, id);
        if (!w.ok) return NextResponse.json({ error: w.error }, { status: 400 });
        update.event_slot_key = null;
      } else {
        const a = await assertSlotBookable(supabase, nextDate, nextSlot, slotConfig, id);
        if (!a.ok) return NextResponse.json({ error: a.error }, { status: 400 });
        update.event_slot_key = nextSlot;
      }
    } else if (slotInBody) {
      update.event_slot_key = nextSlot;
    }
  }

  const { data, error } = await supabase.from("bookings").update(update).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  const { data: before } = await supabase.from("bookings").select("*").eq("id", id).maybeSingle();
  if (!before) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  await supabase.from("invoices").update({ booking_id: null }).eq("booking_id", id);

  const { error } = await supabase.from("bookings").delete().eq("id", id);
  if (error) {
    return NextResponse.json(
      { error: error.message + " If this persists, remove linked invoices or payments in Supabase, then try again." },
      { status: 500 },
    );
  }
  await writeAuditLog(supabase, user, {
    action: "delete",
    entity_type: "booking",
    entity_id: id,
    booking_id: id,
    summary: `Deleted booking ${before?.client_name || before?.client_email || id} · ${before?.event_date || ""}`,
    payload_before: before
      ? {
          id: before.id,
          client_name: before.client_name,
          client_email: before.client_email,
          event_date: before.event_date,
          status: before.status,
          total_cents: before.total_cents,
        }
      : null,
  });
  return NextResponse.json({ ok: true });
}
