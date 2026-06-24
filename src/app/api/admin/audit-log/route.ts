import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";
import { extractBookingCode } from "@/lib/audit-log-display";

const LIST_COLUMNS =
  "id, actor_display_name, actor_email, action, entity_type, entity_id, booking_id, summary, created_at";

/** Admin-only: paginated audit log (list view — no heavy JSON payloads). */
export async function GET(request: Request) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const { data: p } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (p?.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") || "25", 10)));
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const entityType = searchParams.get("entity_type");
  let bookingId = searchParams.get("booking_id");
  const bookingCode = searchParams.get("booking_code")?.trim();
  let filterWarning: string | null = null;

  if (bookingCode && !bookingId) {
    const { data: b } = await supabase.from("bookings").select("id").eq("booking_code", bookingCode).maybeSingle();
    if (b?.id) {
      bookingId = b.id;
    } else {
      return NextResponse.json({
        rows: [],
        total: 0,
        page,
        limit,
        totalPages: 1,
        filterWarning: `No booking found with code “${bookingCode}”.`,
      });
    }
  }

  const action = searchParams.get("action");
  const q = searchParams.get("q")?.trim();
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");

  let qb = supabase.from("admin_audit_log").select(LIST_COLUMNS, { count: "exact" });
  if (entityType) qb = qb.eq("entity_type", entityType);
  if (bookingId) qb = qb.eq("booking_id", bookingId);
  if (action) qb = qb.eq("action", action);
  if (dateFrom) qb = qb.gte("created_at", dateFrom);
  if (dateTo) qb = qb.lte("created_at", dateTo + "T23:59:59.999Z");
  if (q) {
    const safe = q.replace(/[%_]/g, "");
    if (safe) qb = qb.ilike("summary", `%${safe}%`);
  }

  const { data, error, count } = await qb.order("created_at", { ascending: false }).range(from, to);
  if (error) {
    if (error.message?.includes("admin_audit_log") || error.code === "42P01") {
      return NextResponse.json({ rows: [], total: 0, totalPages: 1, needsMigration: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];
  const bidSet = [...new Set(rows.map((r) => r.booking_id).filter(Boolean))] as string[];
  const codeMap: Record<string, string> = {};
  if (bidSet.length) {
    const { data: bs } = await supabase.from("bookings").select("id, booking_code").in("id", bidSet);
    for (const b of bs || []) {
      if (b.booking_code) codeMap[b.id] = b.booking_code;
    }
  }

  const rowsWithCode = rows.map((r) => {
    const liveCode = r.booking_id ? codeMap[r.booking_id] ?? null : null;
    const payloadCode = liveCode
      ? null
      : extractBookingCode(r.summary, null);
    return {
      ...r,
      booking_code: liveCode || payloadCode,
    };
  });

  return NextResponse.json({
    rows: rowsWithCode,
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit) || 1,
    filterWarning,
  });
}
