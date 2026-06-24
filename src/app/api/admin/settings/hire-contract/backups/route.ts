import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";
import { HIRE_CONTRACT_SETTINGS_KEY, listSettingsBackups } from "@/lib/settings-backup";

/** List saved hire contract setting backups (newest first). */
export async function GET(request: Request) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  try {
    const rows = await listSettingsBackups(supabase, HIRE_CONTRACT_SETTINGS_KEY);
    return NextResponse.json({ rows });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not load backups";
    if (msg.includes("site_settings_backups") || msg.includes("does not exist")) {
      return NextResponse.json({ rows: [], needsMigration: true });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** Save a manual backup of the current live settings (optional body label). */
export async function POST(request: Request) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const body = await request.json().catch(() => ({}));
  const label = typeof body.label === "string" ? body.label.trim() : "";

  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", HIRE_CONTRACT_SETTINGS_KEY)
    .maybeSingle();
  if (!data?.value) {
    return NextResponse.json({ error: "No hire contract settings saved yet." }, { status: 400 });
  }

  try {
    const { createSettingsBackup } = await import("@/lib/settings-backup");
    await createSettingsBackup(
      supabase,
      HIRE_CONTRACT_SETTINGS_KEY,
      data.value,
      user,
      label || undefined,
    );
    const rows = await listSettingsBackups(supabase, HIRE_CONTRACT_SETTINGS_KEY);
    return NextResponse.json({ ok: true, rows });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Backup failed" }, { status: 500 });
  }
}
