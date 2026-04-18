import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";
import { upcomingExportBounds, type UpcomingExportBody } from "@/lib/upcoming-export-query";

export async function POST(request: Request) {
  if (!(await getAuthUserFromRequest(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  let body: UpcomingExportBody = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { eventFrom, eventTo, statusIn } = upcomingExportBounds(body);
  let qb = supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .gte("event_date", eventFrom)
    .in("status", statusIn);
  if (eventTo) qb = qb.lte("event_date", eventTo);
  const { count, error } = await qb;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ count: count ?? 0 });
}
