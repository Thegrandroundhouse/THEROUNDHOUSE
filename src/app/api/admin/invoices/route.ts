import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";

function normalizeLines(raw: unknown): { description: string; detail?: string; quantity: number; unit_cents: number; line_total_cents: number }[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row: Record<string, unknown>) => {
    const qty = Math.max(1, Number(row.quantity) || 1);
    const unit = Number(row.unit_cents ?? row.amount_cents ?? 0) || 0;
    const lineTotal = Number(row.line_total_cents) || unit * qty;
    return {
      description: String(row.description || row.label || "Item"),
      detail: row.detail ? String(row.detail) : undefined,
      quantity: qty,
      unit_cents: unit,
      line_total_cents: lineTotal,
    };
  });
}

async function nextInvoiceNumber(supabase: NonNullable<ReturnType<typeof getAdminClient>>): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const { data } = await supabase.from("invoices").select("invoice_number").like("invoice_number", `${prefix}%`);
  let max = 0;
  for (const row of data || []) {
    const n = parseInt(String(row.invoice_number).replace(prefix, ""), 10);
    if (!Number.isNaN(n)) max = Math.max(max, n);
  }
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

export async function GET(request: Request) {
  if (!(await getAuthUserFromRequest(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const { searchParams } = new URL(request.url);
  const bookingId = searchParams.get("booking_id");
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");
  const statusParam = searchParams.get("status");
  const dueParam = searchParams.get("due");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") || "25", 10)));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const today = new Date().toISOString().slice(0, 10);
  const weekAhead = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);

  let query = supabase.from("invoices").select("*", { count: "exact" }).order("created_at", { ascending: false });
  if (bookingId) query = query.eq("booking_id", bookingId);
  if (statusParam && ["draft", "sent", "paid", "cancelled"].includes(statusParam)) {
    query = query.eq("status", statusParam);
  }
  if (dueParam === "overdue") {
    query = query.not("due_date", "is", null).lt("due_date", today).in("status", ["sent", "draft"]);
  } else if (dueParam === "due_soon") {
    query = query
      .not("due_date", "is", null)
      .gte("due_date", today)
      .lte("due_date", weekAhead)
      .in("status", ["sent", "draft"]);
  }
  if (dateFrom && /^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) {
    query = query.gte("issued_date", dateFrom);
  }
  if (dateTo && /^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
    query = query.lte("issued_date", dateTo);
  }
  const { data, error, count } = await query.range(from, to);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data || [];
  const bookingIds = [...new Set(rows.map((i: { booking_id: string | null }) => i.booking_id).filter(Boolean))] as string[];
  let bookingMap: Record<string, { client_name: string | null; client_email: string; client_phone: string | null; event_date: string; booking_code: string | null }> = {};
  if (bookingIds.length) {
    const { data: bookings } = await supabase.from("bookings").select("id, client_name, client_email, client_phone, event_date, booking_code").in("id", bookingIds);
    for (const b of bookings || []) bookingMap[b.id] = b;
  }

  const totalPages = Math.ceil((count ?? 0) / limit) || 1;
  return NextResponse.json({
    rows: rows.map((inv: Record<string, unknown> & { booking_id: string | null }) => ({
      ...inv,
      booking: inv.booking_id ? bookingMap[inv.booking_id] || null : null,
    })),
    total: count ?? 0,
    page,
    limit,
    totalPages,
  });
}

export async function POST(request: Request) {
  if (!(await getAuthUserFromRequest(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  type BookingRow = {
    id: string;
    client_name: string | null;
    client_email: string;
    total_cents: number | null;
    event_date: string;
    package_name: string | null;
  };
  let booking: BookingRow | null = null;
  if (body.booking_id) {
    const { data: b } = await supabase
      .from("bookings")
      .select("id, client_name, client_email, total_cents, event_date, package_name")
      .eq("id", body.booking_id)
      .maybeSingle();
    if (b) booking = b as BookingRow;
  }

  const lineItems = normalizeLines(body.line_items);
  let subtotal = lineItems.reduce((s, l) => s + l.line_total_cents, 0);
  if (!lineItems.length && booking?.total_cents) {
    subtotal = booking.total_cents;
    lineItems.push({
      description: booking.package_name || "Venue & services",
      detail: booking.event_date ? `Event date ${booking.event_date}` : undefined,
      quantity: 1,
      unit_cents: booking.total_cents,
      line_total_cents: booking.total_cents,
    });
  }
  const taxCents = Math.round(Number(body.tax_cents) || 0);
  const totalCents = subtotal + taxCents;
  const invoiceNumber = await nextInvoiceNumber(supabase);

  const issued = body.issued_date || new Date().toISOString().slice(0, 10);

  const logoUrl = typeof body.logo_url === "string" && body.logo_url.trim() ? body.logo_url.trim() : null;

  const { data, error } = await supabase
    .from("invoices")
    .insert({
      booking_id: body.booking_id || null,
      invoice_number: invoiceNumber,
      amount_cents: totalCents,
      subtotal_cents: subtotal,
      tax_cents: taxCents,
      due_date: body.due_date || null,
      status: body.status || "draft",
      line_items: lineItems,
      client_name: body.client_name ?? booking?.client_name ?? null,
      client_email: body.client_email ?? booking?.client_email ?? "",
      client_address: body.client_address ?? null,
      notes: body.notes ?? null,
      issued_date: issued,
      logo_url: logoUrl,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
