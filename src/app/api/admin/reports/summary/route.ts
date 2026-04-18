import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";

function formatMonthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return ym;
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

const DEFAULT_STATUSES = ["pending", "confirmed", "completed"] as const;

export async function GET(request: Request) {
  if (!(await getAuthUserFromRequest(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get("date_from"); // YYYY-MM-DD event_date >=
  const dateTo = searchParams.get("date_to");
  const statusesParam = searchParams.get("statuses");
  const statuses = statusesParam
    ? statusesParam.split(",").filter((s) => ["pending", "confirmed", "completed", "cancelled"].includes(s))
    : [...DEFAULT_STATUSES];

  try {
    const [{ count: bookingsTotal }, { data: enquiries }] = await Promise.all([
      supabase.from("bookings").select("*", { count: "exact", head: true }),
      supabase.from("enquiries").select("status, created_at"),
    ]);

    let bookingsQb = supabase.from("bookings").select("event_date, total_cents, status").in("status", statuses);
    if (dateFrom) bookingsQb = bookingsQb.gte("event_date", dateFrom);
    if (dateTo) bookingsQb = bookingsQb.lte("event_date", dateTo);
    const { data: bookingsFiltered } = await bookingsQb;

    const byStatus: Record<string, number> = {};
    const enquiriesCreatedByMonth: Record<string, number> = {};
    for (const e of enquiries ?? []) {
      byStatus[e.status] = (byStatus[e.status] || 0) + 1;
      const raw = (e as { created_at?: string }).created_at;
      if (raw) {
        const m = new Date(raw).toISOString().slice(0, 7);
        enquiriesCreatedByMonth[m] = (enquiriesCreatedByMonth[m] || 0) + 1;
      }
    }

    const bookingsByStatusInFilter: Record<string, number> = {};
    for (const b of bookingsFiltered ?? []) {
      const st = (b as { status?: string }).status || "unknown";
      bookingsByStatusInFilter[st] = (bookingsByStatusInFilter[st] || 0) + 1;
    }
    const monthRevenue: Record<string, number> = {};
    const monthBookingCount: Record<string, number> = {};
    for (const b of bookingsFiltered ?? []) {
      if (!b.event_date) continue;
      const m = (b.event_date as string).slice(0, 7);
      monthRevenue[m] = (monthRevenue[m] || 0) + (b.total_cents || 0);
      monthBookingCount[m] = (monthBookingCount[m] || 0) + 1;
    }
    const converted = byStatus.converted || 0;
    const totalEnq = enquiries?.length || 0;
    const totalRevenuePence = Object.values(monthRevenue).reduce((a, b) => a + b, 0);
    const allMonths = Array.from(new Set([...Object.keys(monthRevenue), ...Object.keys(monthBookingCount)])).sort();
    const monthsTrimmed = allMonths.slice(-18);
    const series = monthsTrimmed.map((month) => ({
      month,
      label: formatMonthLabel(month),
      revenuePence: monthRevenue[month] || 0,
      bookings: monthBookingCount[month] || 0,
    }));

    const enqMonthKeys = Array.from(new Set(Object.keys(enquiriesCreatedByMonth))).sort();
    const enqMonthsTrimmed = enqMonthKeys.slice(-18);
    const enquiriesVolumeSeries = enqMonthsTrimmed.map((month) => ({
      month,
      label: formatMonthLabel(month),
      count: enquiriesCreatedByMonth[month] || 0,
    }));

    const bookingsInFilter = bookingsFiltered?.length ?? 0;

    return NextResponse.json({
      bookingsTotal: bookingsTotal ?? 0,
      bookingsInFilter,
      enquiriesTotal: totalEnq,
      enquiriesByStatus: byStatus,
      leadConversionRate: totalEnq ? Math.round((converted / totalEnq) * 100) : 0,
      revenueByMonth: monthRevenue,
      bookingsByEventMonth: monthBookingCount,
      totalRevenuePence,
      series,
      bookingsByStatusInFilter,
      enquiriesVolumeSeries,
      filtersApplied: { dateFrom, dateTo, statuses },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
