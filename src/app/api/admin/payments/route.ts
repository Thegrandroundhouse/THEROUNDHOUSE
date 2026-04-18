import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";
import { writeAuditLog } from "@/lib/audit-log";

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

export async function GET(request: Request) {
  if (!(await getAuthUserFromRequest(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10)));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const flowParam = searchParams.get("flow");
  const flows = ["customer_in", "vendor_out", "vendor_in", "adjustment"] as const;
  const flowOk = flowParam && flows.includes(flowParam as (typeof flows)[number]) ? flowParam : null;
  const qRaw = (searchParams.get("q") || "").replace(/%/g, "").trim().slice(0, 80);

  let countQb = supabase.from("payment_records").select("*", { count: "exact", head: true });
  if (flowOk) countQb = countQb.eq("flow", flowOk);
  if (qRaw.length >= 2) countQb = countQb.or(`label.ilike.%${qRaw}%,notes.ilike.%${qRaw}%`);
  const { count, error: cErr } = await countQb;
  if (cErr) {
    if (cErr.code === "42P01" || cErr.message.includes("does not exist"))
      return NextResponse.json({ rows: [], total: 0, page, limit, totalPages: 1, needsMigration: true });
    return NextResponse.json({ error: cErr.message }, { status: 500 });
  }

  let dataQb = supabase.from("payment_records").select("*").order("paid_at", { ascending: false });
  if (flowOk) dataQb = dataQb.eq("flow", flowOk);
  if (qRaw.length >= 2) dataQb = dataQb.or(`label.ilike.%${qRaw}%,notes.ilike.%${qRaw}%`);
  const { data: rows, error } = await dataQb.range(from, to);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const bookingIds = [...new Set((rows || []).map((r: { booking_id: string }) => r.booking_id))];
  const vendorIds = [...new Set((rows || []).map((r: { vendor_id: string | null }) => r.vendor_id).filter(Boolean))] as string[];
  const bookingMap: Record<string, { client_name: string | null; client_email: string; event_date: string; booking_code: string | null }> = {};
  const vendorMap: Record<string, string> = {};
  if (bookingIds.length) {
    const { data: bs } = await supabase.from("bookings").select("id, client_name, client_email, event_date, booking_code").in("id", bookingIds);
    for (const b of bs || []) bookingMap[b.id] = b;
  }
  if (vendorIds.length) {
    const { data: vs } = await supabase.from("vendors").select("id, name").in("id", vendorIds);
    for (const v of vs || []) vendorMap[v.id] = v.name;
  }

  // Do not spread booking row — it includes `id` and would overwrite payment_record.id (breaks React keys / ledger).
  const mapped = (rows || []).map((r: Record<string, unknown>) => {
    const bk = bookingMap[r.booking_id as string];
    return {
      id: r.id as string,
      booking_id: r.booking_id as string,
      vendor_id: r.vendor_id as string | null,
      flow: r.flow as string,
      amount_cents: r.amount_cents as number,
      label: r.label as string,
      notes: r.notes as string | null,
      paid_at: r.paid_at as string,
      client_name: bk?.client_name ?? null,
      client_email: bk?.client_email ?? null,
      event_date: bk?.event_date ?? null,
      booking_code: bk?.booking_code ?? null,
      vendor_name: r.vendor_id ? vendorMap[r.vendor_id as string] : null,
    };
  });

  return NextResponse.json({
    rows: mapped,
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit) || 1,
  });
}

export async function POST(request: Request) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const { data, error } = await supabase
    .from("payment_records")
    .insert({
      booking_id: body.booking_id,
      vendor_id: body.vendor_id || null,
      flow: body.flow || "customer_in",
      amount_cents: Number(body.amount_cents) || 0,
      label: String(body.label || "Payment"),
      notes: body.notes || null,
      paid_at: body.paid_at || new Date().toISOString(),
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writeAuditLog(supabase, user, {
    action: "payment_recorded",
    entity_type: "payment_record",
    entity_id: data.id,
    booking_id: body.booking_id,
    summary: `Payment ${data.flow} £${(data.amount_cents / 100).toFixed(2)} — ${data.label}`,
    payload_after: {
      flow: data.flow,
      amount_cents: data.amount_cents,
      label: data.label,
      vendor_id: data.vendor_id,
    },
  });
  return NextResponse.json(data);
}
