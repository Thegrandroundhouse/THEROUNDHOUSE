import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";
import { writeAuditLog } from "@/lib/audit-log";
import { restoreBookingContractBackup } from "@/lib/booking-contract-draft";

/** Restore this booking's contract configuration from a backup. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: bookingId } = await params;
  const body = await request.json().catch(() => ({}));
  const backupId = typeof body.backup_id === "string" ? body.backup_id.trim() : "";
  if (!backupId) return NextResponse.json({ error: "backup_id required" }, { status: 400 });

  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  try {
    const draft = await restoreBookingContractBackup(supabase, bookingId, backupId, user);
    await writeAuditLog(supabase, user, {
      action: "update",
      entity_type: "booking",
      entity_id: bookingId,
      booking_id: bookingId,
      summary: "Booking: restored hire contract configuration from backup",
      metadata: { backup_id: backupId, path: `/admin/bookings/${bookingId}` },
    });
    return NextResponse.json({ draft, saved: true, saved_at: new Date().toISOString() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Restore failed";
    if (msg.includes("booking_contract_draft") || msg.includes("does not exist")) {
      return NextResponse.json(
        { error: "Contract backups require migration 047_booking_contract_draft.sql in Supabase." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
