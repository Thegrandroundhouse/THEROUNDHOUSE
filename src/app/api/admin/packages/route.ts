import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";

export async function GET(request: Request) {
  if (!(await getAuthUserFromRequest(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(5, parseInt(searchParams.get("limit") || "25", 10)));
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const { data, error, count } = await supabase
    .from("packages")
    .select("*", { count: "exact" })
    .order("sort_order", { ascending: true })
    .range(from, to);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const totalPages = Math.ceil((count ?? 0) / limit) || 1;
  return NextResponse.json({
    rows: data ?? [],
    total: count ?? 0,
    page,
    limit,
    totalPages,
  });
}

function normalizeSlotKeys(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim());
}

function sumLineItems(items: unknown): number {
  if (!Array.isArray(items)) return 0;
  return items.reduce((s: number, row: { amount_cents?: number }) => s + (Number(row?.amount_cents) || 0), 0);
}

export async function POST(request: Request) {
  if (!(await getAuthUserFromRequest(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const lineItems = Array.isArray(body.line_items) ? body.line_items : [];
  const fromLines = sumLineItems(lineItems);
  const base =
    body.base_price_cents != null && body.base_price_cents !== ""
      ? Number(body.base_price_cents)
      : fromLines || null;
  const slotKeys = normalizeSlotKeys(body.event_slot_keys);
  const { data, error } = await supabase
    .from("packages")
    .insert({
      name: String(body.name || "Package"),
      description: body.description || null,
      base_price_cents: base,
      includes: body.includes ?? [],
      line_items: lineItems,
      sort_order: body.sort_order ?? 0,
      active: body.active !== false,
      event_slot_keys: slotKeys,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
