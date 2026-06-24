import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";
import { writeAuditLog } from "@/lib/audit-log";
import {
  HIRE_CONTRACT_SETTINGS_KEY,
  restoreSettingsBackup,
} from "@/lib/settings-backup";
import {
  parseHireContractSettingsValue,
  type HireContractSettingsPayload,
} from "@/lib/hire-contract-settings";

/** Restore hire contract settings from a backup snapshot. */
export async function POST(request: Request) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const body = await request.json().catch(() => ({}));
  const backupId = typeof body.backup_id === "string" ? body.backup_id.trim() : "";
  if (!backupId) return NextResponse.json({ error: "backup_id required" }, { status: 400 });

  const { data: prevRow } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", HIRE_CONTRACT_SETTINGS_KEY)
    .maybeSingle();
  const beforePayload: HireContractSettingsPayload = prevRow?.value
    ? parseHireContractSettingsValue(prevRow.value)
    : parseHireContractSettingsValue(null);

  try {
    const restored = await restoreSettingsBackup(supabase, HIRE_CONTRACT_SETTINGS_KEY, backupId, user);
    const payload = parseHireContractSettingsValue(restored);
    await writeAuditLog(supabase, user, {
      action: "update",
      entity_type: "site_setting",
      summary: `Settings: restored hire contract PDF defaults from backup`,
      payload_before: beforePayload as unknown as Record<string, unknown>,
      payload_after: payload as unknown as Record<string, unknown>,
      metadata: { setting_key: HIRE_CONTRACT_SETTINGS_KEY, backup_id: backupId, path: "/admin/settings?tab=contract" },
    });
    return NextResponse.json(payload);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Restore failed";
    if (msg.includes("site_settings_backups") || msg.includes("does not exist")) {
      return NextResponse.json(
        { error: "Backups are not enabled yet — run migration 046_site_settings_backups.sql in Supabase." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
