import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";
import { writeAuditLog } from "@/lib/audit-log";

const KEY = "invoice_logo_url";

export async function GET(request: Request) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const { data, error } = await supabase.from("site_settings").select("value").eq("key", KEY).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const value = data?.value;
  const url = value != null && typeof value === "string" ? value : null;
  return NextResponse.json({ url });
}

export async function PUT(request: Request) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const body = await request.json().catch(() => ({}));
  const url = typeof body.url === "string" ? body.url.trim() || null : null;
  const { data: prevRow } = await supabase.from("site_settings").select("value").eq("key", KEY).maybeSingle();
  const beforeUrl =
    prevRow?.value != null && typeof prevRow.value === "string" ? prevRow.value : null;
  const { error } = await supabase
    .from("site_settings")
    .upsert(
      { key: KEY, value: url != null ? JSON.stringify(url) : null, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writeAuditLog(supabase, user, {
    action: "update",
    entity_type: "site_setting",
    summary: url ? "Settings: updated preferred invoice logo" : "Settings: cleared preferred invoice logo",
    payload_before: { setting_key: KEY, logo_url: beforeUrl },
    payload_after: { setting_key: KEY, logo_url: url },
    metadata: { setting_key: KEY, path: "/admin/settings" },
  });
  return NextResponse.json({ url });
}
