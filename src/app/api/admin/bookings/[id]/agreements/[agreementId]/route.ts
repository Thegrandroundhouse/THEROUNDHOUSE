import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";
import { writeAuditLog } from "@/lib/audit-log";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; agreementId: string }> }) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: bookingId, agreementId } = await params;
  const body = await request.json().catch(() => ({}));
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const u: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.client_signed === true) u.client_signed_at = new Date().toISOString();
  if (body.venue_signed === true) u.venue_signed_at = new Date().toISOString();
  const { data, error } = await supabase
    .from("booking_agreements")
    .update(u)
    .eq("id", agreementId)
    .eq("booking_id", bookingId)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; agreementId: string }> }) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: bookingId, agreementId } = await params;
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const { error } = await supabase.from("booking_agreements").delete().eq("id", agreementId).eq("booking_id", bookingId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writeAuditLog(supabase, user, {
    action: "delete",
    entity_type: "booking_agreement",
    entity_id: agreementId,
    booking_id: bookingId,
    summary: "Deleted generated agreement from booking",
  });
  return NextResponse.json({ ok: true });
}
