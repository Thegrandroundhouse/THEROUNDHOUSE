import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const ENQ_LIMIT = 50;

export async function GET(request: Request) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || String(ENQ_LIMIT), 10)));
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const eventDateFrom = searchParams.get("event_date_from");
  const eventDateTo = searchParams.get("event_date_to");
  let q = supabase.from("enquiries").select("*", { count: "exact" }).order("created_at", { ascending: false });
  if (eventDateFrom && /^\d{4}-\d{2}-\d{2}$/.test(eventDateFrom)) {
    q = q.gte("event_date", eventDateFrom);
  }
  if (eventDateTo && /^\d{4}-\d{2}-\d{2}$/.test(eventDateTo)) {
    q = q.lte("event_date", eventDateTo);
  }
  const { data, error, count } = await q.range(from, to);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = data ?? [];
  const ids = rows.map((r: { id: string }) => r.id);
  const holdByEnquiry: Record<
    string,
    { hold_date: string; expires_at: string | null; event_slot_key: string | null }
  > = {};
  if (ids.length > 0) {
    const { data: holds } = await supabase
      .from("date_holds")
      .select("enquiry_id, hold_date, expires_at, event_slot_key")
      .is("released_at", null)
      .in("enquiry_id", ids);
    const now = Date.now();
    for (const h of holds ?? []) {
      const eid = h.enquiry_id as string;
      if (!eid) continue;
      const exp = h.expires_at ? new Date(h.expires_at).getTime() : null;
      if (exp != null && exp < now) continue;
      if (!holdByEnquiry[eid]) {
        holdByEnquiry[eid] = {
          hold_date: h.hold_date,
          expires_at: h.expires_at,
          event_slot_key: h.event_slot_key ?? null,
        };
      }
    }
  }
  const enriched = rows.map((r: { id: string }) => ({
    ...r,
    active_hold: holdByEnquiry[r.id] ?? null,
  }));
  return NextResponse.json({
    rows: enriched,
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit) || 1,
  });
}
