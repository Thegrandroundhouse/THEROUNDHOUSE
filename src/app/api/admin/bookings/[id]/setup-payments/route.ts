import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";
import { contractSumFromBooking, ensureBookingPaymentMilestones } from "@/lib/booking-payment-setup";

/** Create hire-contract payment instalments (4×25% by default) when missing. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAuthUserFromRequest(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: bookingId } = await params;
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const { data: booking } = await supabase
    .from("bookings")
    .select("total_cents, deposit_cents, balance_cents")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  const contractSum = contractSumFromBooking(booking);
  if (contractSum <= 0) {
    return NextResponse.json(
      { error: "Set a total or deposit & balance on the booking first — needed for the 25% instalment schedule." },
      { status: 400 },
    );
  }

  try {
    const result = await ensureBookingPaymentMilestones(supabase, bookingId);
    const { data: milestones } = await supabase
      .from("booking_payment_milestones")
      .select("id, label, amount_cents, status, sort_order, due_date")
      .eq("booking_id", bookingId)
      .order("sort_order");

    return NextResponse.json({ ok: true, created: result.created, milestones: milestones ?? [] });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn’t set up payment schedule" }, { status: 500 });
  }
}
