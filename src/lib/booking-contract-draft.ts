import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  applyLineItemTotalsToContract,
  parseContractData,
} from "@/lib/build-banqueting-contract";
import type { RoundhouseContractData } from "@/lib/roundhouse-contract-types";

export const MAX_BOOKING_CONTRACT_BACKUPS = 15;

export type BookingContractBackupRow = {
  id: string;
  booking_id: string;
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

export function normalizeContractDraftPayload(raw: unknown): RoundhouseContractData | null {
  const parsed = parseContractData(raw);
  if (!parsed) return null;
  return applyLineItemTotalsToContract(parsed);
}

export async function loadBookingContractDraft(
  supabase: SupabaseClient,
  bookingId: string,
): Promise<RoundhouseContractData | null> {
  const { data, error } = await supabase
    .from("bookings")
    .select("hire_contract_draft")
    .eq("id", bookingId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.hire_contract_draft) return null;
  return normalizeContractDraftPayload(data.hire_contract_draft);
}

export async function createBookingContractBackup(
  supabase: SupabaseClient,
  bookingId: string,
  value: unknown,
  user: User | null,
  label?: string,
): Promise<void> {
  const name = await actorName(supabase, user);
  await supabase.from("booking_contract_draft_backups").insert({
    booking_id: bookingId,
    value: value as Record<string, unknown>,
    label: label?.trim() || defaultLabel(),
    created_by: user?.id ?? null,
    created_by_name: name,
  });

  const { data: rows } = await supabase
    .from("booking_contract_draft_backups")
    .select("id")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false });
  const ids = (rows ?? []).map((r) => r.id as string);
  if (ids.length > MAX_BOOKING_CONTRACT_BACKUPS) {
    await supabase.from("booking_contract_draft_backups").delete().in("id", ids.slice(MAX_BOOKING_CONTRACT_BACKUPS));
  }
}

export async function saveBookingContractDraft(
  supabase: SupabaseClient,
  bookingId: string,
  draft: RoundhouseContractData,
  user: User | null,
  options?: { backupLabel?: string; skipBackupIfEmpty?: boolean },
): Promise<RoundhouseContractData> {
  const normalized = applyLineItemTotalsToContract(draft);
  const { data: current } = await supabase
    .from("bookings")
    .select("hire_contract_draft")
    .eq("id", bookingId)
    .maybeSingle();

  const hasCurrent = Boolean(current?.hire_contract_draft);
  if (hasCurrent || !options?.skipBackupIfEmpty) {
    if (current?.hire_contract_draft) {
      await createBookingContractBackup(
        supabase,
        bookingId,
        current.hire_contract_draft,
        user,
        options?.backupLabel ||
          `Before save · ${new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}`,
      );
    }
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("bookings")
    .update({
      hire_contract_draft: normalized as unknown as Record<string, unknown>,
      hire_contract_draft_updated_at: now,
      // Keep list / payments total aligned with configured line items.
      total_cents: normalized.contractSumCents,
    })
    .eq("id", bookingId);
  if (error) throw new Error(error.message);
  return normalized;
}

export async function listBookingContractBackups(
  supabase: SupabaseClient,
  bookingId: string,
  limit = MAX_BOOKING_CONTRACT_BACKUPS,
): Promise<BookingContractBackupRow[]> {
  const { data, error } = await supabase
    .from("booking_contract_draft_backups")
    .select("id, booking_id, label, created_by_name, created_at")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as BookingContractBackupRow[];
}

export async function restoreBookingContractBackup(
  supabase: SupabaseClient,
  bookingId: string,
  backupId: string,
  user: User | null,
): Promise<RoundhouseContractData> {
  const { data: backup, error: fetchErr } = await supabase
    .from("booking_contract_draft_backups")
    .select("id, value")
    .eq("id", backupId)
    .eq("booking_id", bookingId)
    .maybeSingle();
  if (fetchErr) throw new Error(fetchErr.message);
  const restored = normalizeContractDraftPayload(backup?.value);
  if (!restored) throw new Error("Backup not found");

  await saveBookingContractDraft(supabase, bookingId, restored, user, {
    backupLabel: `Before restore · ${new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}`,
  });
  return restored;
}
