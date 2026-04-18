import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";
import { enquiriesEventBounds, type EnquiriesExportBody } from "@/lib/enquiries-export-query";

export async function POST(request: Request) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  let body: EnquiriesExportBody = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { from, to } = enquiriesEventBounds(body);
  const status = body.status;
  let qb = supabase.from("enquiries").select("*", { count: "exact", head: true });
  if (status && ["new", "contacted", "quoted", "converted", "lost"].includes(status)) {
    qb = qb.eq("status", status);
  }
  if (from && to) {
    qb = qb.not("event_date", "is", null).gte("event_date", from).lte("event_date", to);
  }
  const { count, error } = await qb;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ count: count ?? 0 });
}
