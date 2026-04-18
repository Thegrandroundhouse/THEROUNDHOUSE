import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "pdf_generated"
  | "payment_recorded"
  | "workspace_update";

export async function writeAuditLog(
  supabase: SupabaseClient,
  user: User | null,
  opts: {
    action: string;
    entity_type: string;
    entity_id?: string | null;
    booking_id?: string | null;
    summary: string;
    payload_before?: Record<string, unknown> | null;
    payload_after?: Record<string, unknown> | null;
    metadata?: Record<string, unknown>;
  },
) {
  let actorDisplay = user?.email ?? "system";
  if (user?.id) {
    const { data: st } = await supabase.from("staff").select("display_name").eq("user_id", user.id).maybeSingle();
    if (st?.display_name?.trim()) actorDisplay = st.display_name.trim();
  }
  const { error } = await supabase.from("admin_audit_log").insert({
    actor_user_id: user?.id ?? null,
    actor_email: user?.email ?? null,
    actor_display_name: actorDisplay,
    action: opts.action,
    entity_type: opts.entity_type,
    entity_id: opts.entity_id ?? null,
    booking_id: opts.booking_id ?? null,
    summary: opts.summary.slice(0, 2000),
    payload_before: opts.payload_before ?? null,
    payload_after: opts.payload_after ?? null,
    metadata: opts.metadata ?? {},
  });
  if (error && process.env.NODE_ENV === "development") console.warn("[audit]", error.message);
}
