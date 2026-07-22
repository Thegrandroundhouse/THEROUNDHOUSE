import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";
import {
  contractSumFromBooking,
  ensureBookingPaymentMilestones,
  previewBookingPaymentSchedule,
  rebuildBookingPaymentMilestones,
} from "@/lib/booking-payment-setup";

/** Preview the 4-instalment plan from current contract sum / line items. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAuthUserFromRequest(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: bookingId } = await params;
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  try {
    const preview = await previewBookingPaymentSchedule(supabase, bookingId);
    if (!preview) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    return NextResponse.json(preview);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn’t preview schedule" }, { status: 500 });
  }
}

/**
 * Create hire-contract payment instalments (4×25% by default) when missing,
 * or rebuild amounts when body.rebuild === true (after mid-booking line/discount changes).
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAuthUserFromRequest(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: bookingId } = await params;
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  let rebuild = false;
  try {
    const body = await request.json().catch(() => ({}));
    rebuild = Boolean(body?.rebuild);
  } catch {
    rebuild = false;
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select("total_cents, deposit_cents, balance_cents")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  const contractSum = contractSumFromBooking(booking);
  if (contractSum <= 0 && !rebuild) {
    // rebuild path also reads draft sum
    const preview = await previewBookingPaymentSchedule(supabase, bookingId);
    if (!preview || preview.contractSumCents <= 0) {
      return NextResponse.json(
        { error: "Set a total or add line items first — needed for the 25% instalment schedule." },
        { status: 400 },
      );
    }
  }

  try {
    if (rebuild) {
      const result = await rebuildBookingPaymentMilestones(supabase, bookingId);
      const preview = await previewBookingPaymentSchedule(supabase, bookingId);
      const { data: milestones } = await supabase
        .from("booking_payment_milestones")
        .select("id, label, amount_cents, status, sort_order, due_date")
        .eq("booking_id", bookingId)
        .order("sort_order");
      return NextResponse.json({
        ok: true,
        rebuilt: result.rebuilt,
        created: false,
        milestones: milestones ?? [],
        preview,
      });
    }

    const result = await ensureBookingPaymentMilestones(supabase, bookingId);
    if (!result.created && result.count > 0) {
      // Already exists — rebuild so mid-way total/line changes apply after confirm
      await rebuildBookingPaymentMilestones(supabase, bookingId);
    }
    const preview = await previewBookingPaymentSchedule(supabase, bookingId);
    const { data: milestones } = await supabase
      .from("booking_payment_milestones")
      .select("id, label, amount_cents, status, sort_order, due_date")
      .eq("booking_id", bookingId)
      .order("sort_order");

    return NextResponse.json({
      ok: true,
      created: result.created,
      rebuilt: !result.created && result.count > 0,
      milestones: milestones ?? [],
      preview,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn’t set up payment schedule" }, { status: 500 });
  }
}
