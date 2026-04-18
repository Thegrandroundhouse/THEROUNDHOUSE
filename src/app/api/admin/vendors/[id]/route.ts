import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";
import { writeAuditLog } from "@/lib/audit-log";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAuthUserFromRequest(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const { data, error } = await supabase.from("vendors").select("*").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const { data: before } = await supabase.from("vendors").select("name").eq("id", id).maybeSingle();
  const u: Record<string, unknown> = { updated_at: new Date().toISOString() };
  ["vendor_type", "name", "email", "phone", "notes", "preferred", "commission_notes", "trade_price_cents", "customer_price_cents", "custom_fields"].forEach((k) => {
    if (body[k] !== undefined) u[k] = body[k];
  });
  const { data, error } = await supabase.from("vendors").update(u).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writeAuditLog(supabase, user, {
    action: "update",
    entity_type: "vendor",
    entity_id: id,
    summary: `Updated vendor ${data.name}`,
    payload_before: before ? { name: before.name } : null,
    payload_after: { name: data.name },
  });
  return NextResponse.json(data);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const { data: before } = await supabase.from("vendors").select("name").eq("id", id).maybeSingle();
  const { error } = await supabase.from("vendors").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writeAuditLog(supabase, user, {
    action: "delete",
    entity_type: "vendor",
    entity_id: id,
    summary: `Deleted vendor ${before?.name || id}`,
    payload_before: before ? { name: before.name } : null,
  });
  return NextResponse.json({ ok: true });
}
