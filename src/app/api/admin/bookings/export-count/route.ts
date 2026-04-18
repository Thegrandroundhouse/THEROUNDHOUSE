import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";

/** Count bookings matching export filters (same rules as PDF/CSV export). */
export async function POST(request: Request) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  let body: {
    year?: string;
    status?: string;
    event_date_from?: string;
    event_date_to?: string;
  } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let eventDateFrom = body.event_date_from;
  let eventDateTo = body.event_date_to;
  const hasRange =
    eventDateFrom &&
    eventDateTo &&
    /^\d{4}-\d{2}-\d{2}$/.test(eventDateFrom) &&
    /^\d{4}-\d{2}-\d{2}$/.test(eventDateTo);
  if (!hasRange && body.year && /^\d{4}$/.test(body.year)) {
    eventDateFrom = `${body.year}-01-01`;
    eventDateTo = `${body.year}-12-31`;
  }

  let qb = supabase.from("bookings").select("*", { count: "exact", head: true });
  if (body.status && ["pending", "confirmed", "cancelled", "completed"].includes(body.status)) {
    qb = qb.eq("status", body.status);
  }
  if (eventDateFrom && /^\d{4}-\d{2}-\d{2}$/.test(eventDateFrom)) qb = qb.gte("event_date", eventDateFrom);
  if (eventDateTo && /^\d{4}-\d{2}-\d{2}$/.test(eventDateTo)) qb = qb.lte("event_date", eventDateTo);

  const { count, error } = await qb;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ count: count ?? 0 });
}
