import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";
import { writeAuditLog } from "@/lib/audit-log";
import { bookingMoneyFromLedger } from "@/lib/booking-money-summary";
import { setBookingPaidToTarget } from "@/lib/booking-payment-setup";

/** Quick-edit paid total from the bookings list (reconciles payment ledger). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: bookingId } = await params;
  const body = await request.json().catch(() => ({}));
  const paid_cents = Math.max(0, Math.round(Number(body.paid_cents) || 0));

  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, booking_code, total_cents, balance_cents")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  try {
    const result = await setBookingPaidToTarget(supabase, bookingId, paid_cents);
    const { stillDueCents } = bookingMoneyFromLedger(booking.total_cents, result.paidCents);
    await supabase
      .from("bookings")
      .update({ balance_cents: stillDueCents, updated_at: new Date().toISOString() })
      .eq("id", bookingId);

    if (result.adjusted) {
      await writeAuditLog(supabase, user, {
        action: "payment_adjusted",
        entity_type: "booking",
        entity_id: bookingId,
        booking_id: bookingId,
        summary: `Set paid total to £${(result.paidCents / 100).toFixed(2)} on booking ${booking.booking_code || bookingId.slice(0, 8)}`,
        payload_after: { paid_cents: result.paidCents, due_cents: stillDueCents },
      });
    }

    return NextResponse.json({
      ok: true,
      paid_cents: result.paidCents,
      due_cents: booking.total_cents != null ? stillDueCents : null,
      total_cents: booking.total_cents,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn’t update paid amount" }, { status: 500 });
  }
}
