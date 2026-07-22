import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";
import { normalizeStoredUkAddress } from "@/lib/uk-address";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAuthUserFromRequest(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const { data, error } = await supabase.from("invoices").select("*").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  let booking = null;
  if (data.booking_id) {
    const { data: b } = await supabase.from("bookings").select("id, booking_code, client_name, client_email, event_date").eq("id", data.booking_id).maybeSingle();
    booking = b;
  }
  return NextResponse.json({ ...data, booking });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAuthUserFromRequest(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const u: Record<string, unknown> = { updated_at: new Date().toISOString() };
  [
    "status",
    "due_date",
    "amount_cents",
    "subtotal_cents",
    "tax_cents",
    "line_items",
    "client_name",
    "client_email",
    "client_address",
    "notes",
    "admin_notes",
    "issued_date",
    "logo_url",
  ].forEach((k) => {
    if (body[k] !== undefined) u[k] = body[k];
  });
  if (body.client_address !== undefined) {
    u.client_address = normalizeStoredUkAddress(body.client_address);
  }
  if (Array.isArray(body.line_items)) {
    const sub = (body.line_items as { line_total_cents?: number }[]).reduce((s, l) => s + (Number(l.line_total_cents) || 0), 0);
    u.subtotal_cents = sub;
    u.amount_cents = sub + (Number(body.tax_cents) ?? 0);
  }
  const { data, error } = await supabase.from("invoices").update(u).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAuthUserFromRequest(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
