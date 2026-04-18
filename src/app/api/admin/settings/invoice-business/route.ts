import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";
import { writeAuditLog } from "@/lib/audit-log";

const KEY = "invoice_business";

export type InvoiceBusinessPayload = {
  venueName: string;
  venueTagline: string;
  venueAddress: string;
  venuePhone: string;
  venueEmail: string;
  bankName: string;
  sortCode: string;
  accountNumber: string;
  accountName: string;
  paymentReference: string;
};

const DEFAULTS: InvoiceBusinessPayload = {
  venueName: "The Grand Round House",
  venueTagline: "Wedding & events venue",
  venueAddress: "",
  venuePhone: "",
  venueEmail: "",
  bankName: "",
  sortCode: "",
  accountNumber: "",
  accountName: "",
  paymentReference: "Invoice number",
};

function normalize(body: unknown): InvoiceBusinessPayload {
  if (!body || typeof body !== "object") return DEFAULTS;
  const o = body as Record<string, unknown>;
  return {
    venueName: typeof o.venueName === "string" ? o.venueName : DEFAULTS.venueName,
    venueTagline: typeof o.venueTagline === "string" ? o.venueTagline : DEFAULTS.venueTagline,
    venueAddress: typeof o.venueAddress === "string" ? o.venueAddress : "",
    venuePhone: typeof o.venuePhone === "string" ? o.venuePhone : "",
    venueEmail: typeof o.venueEmail === "string" ? o.venueEmail : "",
    bankName: typeof o.bankName === "string" ? o.bankName : "",
    sortCode: typeof o.sortCode === "string" ? o.sortCode : "",
    accountNumber: typeof o.accountNumber === "string" ? o.accountNumber : "",
    accountName: typeof o.accountName === "string" ? o.accountName : "",
    paymentReference: typeof o.paymentReference === "string" ? o.paymentReference : DEFAULTS.paymentReference,
  };
}

export async function GET(request: Request) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const { data, error } = await supabase.from("site_settings").select("value").eq("key", KEY).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const value = data?.value;
  const payload: InvoiceBusinessPayload =
    value && typeof value === "object" && !Array.isArray(value)
      ? { ...DEFAULTS, ...(value as Record<string, string>) }
      : DEFAULTS;
  return NextResponse.json(payload);
}

export async function PUT(request: Request) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const body = await request.json().catch(() => ({}));
  const payload = normalize(body);
  const { data: prevRow } = await supabase.from("site_settings").select("value").eq("key", KEY).maybeSingle();
  const beforePayload: InvoiceBusinessPayload =
    prevRow?.value && typeof prevRow.value === "object" && !Array.isArray(prevRow.value)
      ? { ...DEFAULTS, ...(prevRow.value as Record<string, string>) }
      : { ...DEFAULTS };
  const { error } = await supabase
    .from("site_settings")
    .upsert(
      { key: KEY, value: payload as unknown as Record<string, unknown>, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writeAuditLog(supabase, user, {
    action: "update",
    entity_type: "site_setting",
    summary: `Settings: updated invoice business details (${payload.venueName})`,
    payload_before: beforePayload as unknown as Record<string, unknown>,
    payload_after: payload as unknown as Record<string, unknown>,
    metadata: { setting_key: KEY, path: "/admin/settings" },
  });
  return NextResponse.json(payload);
}
