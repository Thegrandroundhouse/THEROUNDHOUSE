import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";

export async function GET(request: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  if (!(await getAuthUserFromRequest(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { bookingId } = await params;
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const { data: booking, error: bErr } = await supabase.from("bookings").select("*").eq("id", bookingId).maybeSingle();
  if (bErr || !booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  const [{ data: milestones }, { data: records }] = await Promise.all([
    supabase.from("booking_payment_milestones").select("*").eq("booking_id", bookingId).order("sort_order"),
    supabase.from("payment_records").select("*").eq("booking_id", bookingId).order("paid_at", { ascending: false }),
  ]);

  const recs = records || [];
  const vids = [...new Set(recs.map((r: { vendor_id: string | null }) => r.vendor_id).filter(Boolean))] as string[];
  const vmap: Record<string, string> = {};
  if (vids.length) {
    const { data: vs } = await supabase.from("vendors").select("id, name").in("id", vids);
    for (const v of vs || []) vmap[v.id] = v.name;
  }
  const recordsWithVendors = recs.map((r: Record<string, unknown> & { vendor_id: string | null; flow: string }) => ({
    ...r,
    vendors: r.vendor_id ? { name: vmap[r.vendor_id] } : null,
  }));
  const sumFlow = (flow: string) =>
    recs.filter((r: { flow: string }) => r.flow === flow).reduce((s, r: { amount_cents: number }) => s + (r.amount_cents || 0), 0);

  return NextResponse.json({
    booking,
    milestones: milestones ?? [],
    records: recordsWithVendors,
    totals: {
      customer_received: sumFlow("customer_in"),
      vendor_paid_out: sumFlow("vendor_out"),
      vendor_received: sumFlow("vendor_in"),
      adjustments: sumFlow("adjustment"),
      milestone_pending: (milestones || [])
        .filter((m: { status: string }) => m.status === "pending" || m.status === "partial")
        .reduce((s: number, m: { amount_cents: number | null }) => s + (m.amount_cents || 0), 0),
    },
  });
}
