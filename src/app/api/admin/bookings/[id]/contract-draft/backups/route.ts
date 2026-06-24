import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";
import {
  createBookingContractBackup,
  listBookingContractBackups,
  loadBookingContractDraft,
} from "@/lib/booking-contract-draft";

/** List saved contract configuration backups for a booking. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAuthUserFromRequest(request)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: bookingId } = await params;
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  try {
    const rows = await listBookingContractBackups(supabase, bookingId);
    return NextResponse.json({ rows });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not load backups";
    if (msg.includes("booking_contract_draft_backups") || msg.includes("does not exist")) {
      return NextResponse.json({ rows: [], needsMigration: true });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** Save a manual backup of the current live contract configuration. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: bookingId } = await params;
  const body = await request.json().catch(() => ({}));
  const label = typeof body.label === "string" ? body.label.trim() : "";
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const draft = await loadBookingContractDraft(supabase, bookingId);
  if (!draft) {
    return NextResponse.json({ error: "No saved contract configuration yet — configure and wait for auto-save first." }, { status: 400 });
  }

  try {
    await createBookingContractBackup(supabase, bookingId, draft, user, label || undefined);
    const rows = await listBookingContractBackups(supabase, bookingId);
    return NextResponse.json({ ok: true, rows });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Backup failed" }, { status: 500 });
  }
}
