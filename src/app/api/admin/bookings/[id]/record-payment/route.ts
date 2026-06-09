import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";
import { writeAuditLog } from "@/lib/audit-log";
import { applyReceivedToMilestones, ensureBookingPaymentMilestones, recordBookingCustomerPayment } from "@/lib/booking-payment-setup";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: bookingId } = await params;
  const body = await request.json().catch(() => ({}));
  const amount_cents = Math.round(Number(body.amount_cents) || 0);
  const label = String(body.label || "Payment").trim() || "Payment";
  const notes = body.notes != null ? String(body.notes) : null;
  const sync_milestones = body.sync_milestones !== false;

  if (amount_cents <= 0) {
    return NextResponse.json({ error: "Enter a valid amount greater than zero." }, { status: 400 });
  }

  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, booking_code, total_cents, deposit_cents, balance_cents")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  try {
    if (sync_milestones) {
      await ensureBookingPaymentMilestones(supabase, bookingId);
    }
    await recordBookingCustomerPayment(supabase, bookingId, amount_cents, label, notes);
    if (sync_milestones) {
      await applyReceivedToMilestones(supabase, bookingId, amount_cents);
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn’t record payment" }, { status: 500 });
  }

  await writeAuditLog(supabase, user, {
    action: "payment_recorded",
    entity_type: "payment_record",
    entity_id: bookingId,
    booking_id: bookingId,
    summary: `Recorded ${label} £${(amount_cents / 100).toFixed(2)} on booking ${booking.booking_code || bookingId.slice(0, 8)}`,
    payload_after: { amount_cents, label, sync_milestones },
  });

  return NextResponse.json({ ok: true, amount_cents, label });
}
