import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";
import { writeAuditLog } from "@/lib/audit-log";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const { data: row, error: fErr } = await supabase.from("payment_records").select("id, booking_id").eq("id", id).maybeSingle();
  if (fErr) return NextResponse.json({ error: fErr.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const u: Record<string, unknown> = {};
  if (body.amount_cents !== undefined) {
    const n = Number(body.amount_cents);
    if (!Number.isFinite(n) || n < 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    u.amount_cents = Math.round(n);
  }
  if (body.label !== undefined) u.label = String(body.label || "Payment").slice(0, 500);
  if (body.notes !== undefined) u.notes = body.notes ? String(body.notes).slice(0, 2000) : null;
  if (body.paid_at !== undefined) {
    const d = new Date(body.paid_at);
    if (Number.isNaN(d.getTime())) return NextResponse.json({ error: "Invalid paid_at" }, { status: 400 });
    u.paid_at = d.toISOString();
  }
  if (body.flow !== undefined) {
    const flows = ["customer_in", "vendor_out", "vendor_in", "adjustment"];
    if (!flows.includes(String(body.flow))) return NextResponse.json({ error: "Invalid flow" }, { status: 400 });
    u.flow = body.flow;
  }
  if (body.vendor_id !== undefined) u.vendor_id = body.vendor_id || null;

  if (Object.keys(u).length === 0) return NextResponse.json({ error: "No updates" }, { status: 400 });

  const { data, error } = await supabase.from("payment_records").update(u).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAuditLog(supabase, user, {
    action: "payment_record_updated",
    entity_type: "payment_record",
    entity_id: id,
    booking_id: row.booking_id,
    summary: `Updated ledger entry £${(data.amount_cents / 100).toFixed(2)}`,
    payload_after: u,
  });

  return NextResponse.json(data);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const { data: row, error: fErr } = await supabase.from("payment_records").select("id, booking_id, label, amount_cents").eq("id", id).maybeSingle();
  if (fErr) return NextResponse.json({ error: fErr.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { error } = await supabase.from("payment_records").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAuditLog(supabase, user, {
    action: "payment_record_deleted",
    entity_type: "payment_record",
    entity_id: id,
    booking_id: row.booking_id,
    summary: `Deleted ledger: ${row.label} (£${(row.amount_cents / 100).toFixed(2)})`,
  });

  return NextResponse.json({ ok: true });
}
