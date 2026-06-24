import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

export const HIRE_CONTRACT_SETTINGS_KEY = "hire_contract_defaults";
export const MAX_SETTINGS_BACKUPS = 25;

export type SettingsBackupRow = {
  id: string;
  setting_key: string;
  label: string | null;
  created_by_name: string | null;
  created_at: string;
};

async function actorName(supabase: SupabaseClient, user: User | null): Promise<string> {
  if (!user?.id) return "system";
  const { data: st } = await supabase.from("staff").select("display_name").eq("user_id", user.id).maybeSingle();
  if (st?.display_name?.trim()) return st.display_name.trim();
  return user.email ?? "Staff";
}

function defaultLabel(when = new Date()): string {
  return `Backup · ${when.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}`;
}

export async function createSettingsBackup(
  supabase: SupabaseClient,
  settingKey: string,
  value: unknown,
  user: User | null,
  label?: string,
): Promise<void> {
  const name = await actorName(supabase, user);
  await supabase.from("site_settings_backups").insert({
    setting_key: settingKey,
    value: value as Record<string, unknown>,
    label: label?.trim() || defaultLabel(),
    created_by: user?.id ?? null,
    created_by_name: name,
  });

  const { data: rows } = await supabase
    .from("site_settings_backups")
    .select("id")
    .eq("setting_key", settingKey)
    .order("created_at", { ascending: false });
  const ids = (rows ?? []).map((r) => r.id as string);
  if (ids.length > MAX_SETTINGS_BACKUPS) {
    const toDrop = ids.slice(MAX_SETTINGS_BACKUPS);
    await supabase.from("site_settings_backups").delete().in("id", toDrop);
  }
}

export async function listSettingsBackups(
  supabase: SupabaseClient,
  settingKey: string,
  limit = MAX_SETTINGS_BACKUPS,
): Promise<SettingsBackupRow[]> {
  const { data, error } = await supabase
    .from("site_settings_backups")
    .select("id, setting_key, label, created_by_name, created_at")
    .eq("setting_key", settingKey)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as SettingsBackupRow[];
}

export async function restoreSettingsBackup(
  supabase: SupabaseClient,
  settingKey: string,
  backupId: string,
  user: User | null,
): Promise<unknown> {
  const { data: backup, error: fetchErr } = await supabase
    .from("site_settings_backups")
    .select("id, value, label, created_at")
    .eq("id", backupId)
    .eq("setting_key", settingKey)
    .maybeSingle();
  if (fetchErr) throw new Error(fetchErr.message);
  if (!backup?.value) throw new Error("Backup not found");

  const { data: current } = await supabase.from("site_settings").select("value").eq("key", settingKey).maybeSingle();
  if (current?.value) {
    await createSettingsBackup(
      supabase,
      settingKey,
      current.value,
      user,
      `Before restore · ${new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}`,
    );
  }

  const { error: upsertErr } = await supabase.from("site_settings").upsert(
    {
      key: settingKey,
      value: backup.value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );
  if (upsertErr) throw new Error(upsertErr.message);
  return backup.value;
}
