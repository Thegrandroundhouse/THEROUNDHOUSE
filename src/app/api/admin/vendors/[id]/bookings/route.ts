import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await getAuthUserFromRequest(request)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: vendorId } = await params;
  const supabase = getAdminClient();
  if (!supabase)
    return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const { data: links, error: e1 } = await supabase
    .from("booking_vendors")
    .select("booking_id, role")
    .eq("vendor_id", vendorId);
  if (e1)
    return NextResponse.json({ error: e1.message }, { status: 500 });
  const ids = (links || []).map((r) => r.booking_id).filter(Boolean);
  if (ids.length === 0) return NextResponse.json([]);

  const { data: bookings, error: e2 } = await supabase
    .from("bookings")
    .select(
      "id, event_date, total_cents, balance_cents, payment_terms, status, booking_code"
    )
    .in("id", ids)
    .order("event_date", { ascending: false });
  if (e2)
    return NextResponse.json({ error: e2.message }, { status: 500 });

  const roleByBooking = new Map(
    (links || []).map((l) => [l.booking_id, l.role as string | null])
  );
  const rows = (bookings || []).map((b) => ({
    ...b,
    role: roleByBooking.get(b.id) ?? null,
    grand_total: b.total_cents != null ? (b.total_cents as number) / 100 : null,
    balance_due: b.balance_cents != null ? (b.balance_cents as number) / 100 : null,
  }));
  return NextResponse.json(rows);
}
