import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";
import { writeAuditLog } from "@/lib/audit-log";
import { contractDataToSummaryText, parseContractData } from "@/lib/build-banqueting-contract";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; agreementId: string }> }) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: bookingId, agreementId } = await params;
  const body = await request.json().catch(() => ({}));
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const u: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.client_signed === true) u.client_signed_at = new Date().toISOString();
  else if (body.client_signed === false) u.client_signed_at = null;
  if (body.venue_signed === true) u.venue_signed_at = new Date().toISOString();
  else if (body.venue_signed === false) u.venue_signed_at = null;
  if (typeof body.title === "string" && body.title.trim()) u.title = body.title.trim();
  if (typeof body.rendered_body === "string") u.rendered_body = body.rendered_body;
  if (body.custom_values !== undefined && typeof body.custom_values === "object" && body.custom_values !== null) {
    u.custom_values = body.custom_values;
    const contract = parseContractData(body.custom_values);
    if (contract) u.rendered_body = contractDataToSummaryText(contract);
  }
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
