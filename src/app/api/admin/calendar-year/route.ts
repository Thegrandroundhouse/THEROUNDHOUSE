import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { loadCalendarOverview } from "@/lib/admin-calendar-overview";
import { formatLocalDateParts } from "@/lib/local-date";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function yearBoundsLocal(year: number): { start: string; end: string } {
  return {
    start: formatLocalDateParts(year, 0, 1),
    end: formatLocalDateParts(year, 11, 31),
  };
}

/** GET: full-year overview — bookings per date, manual blocks, halls */
export async function GET(request: NextRequest) {
  const authUser = await getAuthUserFromRequest(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const y = parseInt(request.nextUrl.searchParams.get("year") || String(new Date().getFullYear()), 10);
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const { start, end } = yearBoundsLocal(y);
  const overview = await loadCalendarOverview(supabase, start, end);

  return NextResponse.json({
    year: y,
    ...overview,
  });
}
