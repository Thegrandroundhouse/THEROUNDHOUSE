import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";
import { writeAuditLog } from "@/lib/audit-log";

const VENDORS_LIMIT = 100;

export async function GET(request: Request) {
  if (!(await getAuthUserFromRequest(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(VENDORS_LIMIT, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const { count } = await supabase.from("vendors").select("*", { count: "exact", head: true });
  const { data, error } = await supabase.from("vendors").select("*").order("name").range(from, to);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    rows: data ?? [],
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
    .from("vendors")
    .insert({
      vendor_type: String(body.vendor_type || "other"),
      name: String(body.name || "Vendor"),
      email: body.email || null,
      phone: body.phone || null,
      notes: body.notes || null,
      preferred: !!body.preferred,
      commission_notes: body.commission_notes || null,
      trade_price_cents: body.trade_price_cents ?? null,
      customer_price_cents: body.customer_price_cents ?? null,
      custom_fields: body.custom_fields && typeof body.custom_fields === "object" ? body.custom_fields : {},
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writeAuditLog(supabase, user, {
    action: "create",
    entity_type: "vendor",
    entity_id: data.id,
    summary: `Created vendor ${data.name}`,
    payload_after: { name: data.name, vendor_type: data.vendor_type },
  });
  return NextResponse.json(data);
}
