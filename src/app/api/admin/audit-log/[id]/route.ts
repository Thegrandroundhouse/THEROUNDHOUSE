import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";
import {
  extractBookingCode,
  payloadToDisplayRows,
} from "@/lib/audit-log-display";

/** Admin-only: fetch a single audit log entry by id. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const { data: p } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (p?.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { id } = await params;
  const { data, error } = await supabase
    .from("admin_audit_log")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const payloadBefore =
    data.payload_before && typeof data.payload_before === "object" && !Array.isArray(data.payload_before)
      ? (data.payload_before as Record<string, unknown>)
      : null;
  const payloadAfter =
    data.payload_after && typeof data.payload_after === "object" && !Array.isArray(data.payload_after)
      ? (data.payload_after as Record<string, unknown>)
      : null;

  let booking_code: string | null = null;
  let booking_still_exists = false;
  if (data.booking_id) {
    const { data: b } = await supabase
      .from("bookings")
      .select("booking_code")
      .eq("id", data.booking_id)
      .maybeSingle();
    if (b?.booking_code) {
      booking_code = b.booking_code;
      booking_still_exists = true;
    }
  }
  if (!booking_code) {
    booking_code =
      extractBookingCode(data.summary, payloadBefore) ||
      extractBookingCode(data.summary, payloadAfter);
  }

  const entityType = String(data.entity_type || "");
  const display_before = payloadToDisplayRows(payloadBefore, entityType);
  const display_after = payloadToDisplayRows(payloadAfter, entityType);

  return NextResponse.json({
    ...data,
    booking_code,
    booking_still_exists,
    display_before,
    display_after,
  });
}
