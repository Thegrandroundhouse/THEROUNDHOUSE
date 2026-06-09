import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";
import { writeAuditLog } from "@/lib/audit-log";
import {
  HIRE_CONTRACT_SETTINGS_DEFAULTS,
  normalizeHireContractSettingsBody,
  parseHireContractSettingsValue,
  type HireContractSettingsPayload,
} from "@/lib/hire-contract-settings";

export type { HireContractSettingsPayload };

const KEY = "hire_contract_defaults";

export async function GET(request: Request) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const { data, error } = await supabase.from("site_settings").select("value").eq("key", KEY).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const payload = data?.value
    ? parseHireContractSettingsValue(data.value)
    : structuredClone(HIRE_CONTRACT_SETTINGS_DEFAULTS);
  return NextResponse.json(payload);
}

export async function PUT(request: Request) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const body = await request.json().catch(() => ({}));
  const payload = normalizeHireContractSettingsBody(body);
  const { data: prevRow } = await supabase.from("site_settings").select("value").eq("key", KEY).maybeSingle();
  const beforePayload: HireContractSettingsPayload = prevRow?.value
    ? parseHireContractSettingsValue(prevRow.value)
    : structuredClone(HIRE_CONTRACT_SETTINGS_DEFAULTS);
  const { error } = await supabase
    .from("site_settings")
    .upsert(
      { key: KEY, value: payload as unknown as Record<string, unknown>, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writeAuditLog(supabase, user, {
    action: "update",
    entity_type: "site_setting",
    summary: "Settings: updated hire contract PDF defaults",
    payload_before: beforePayload as unknown as Record<string, unknown>,
    payload_after: payload as unknown as Record<string, unknown>,
    metadata: { setting_key: KEY, path: "/admin/settings?tab=contract" },
  });
  return NextResponse.json(payload);
}
