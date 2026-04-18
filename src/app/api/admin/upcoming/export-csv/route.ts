import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";
import {
  UPCOMING_EXPORT_COLUMNS_DEFAULT,
  type UpcomingListExportColumns,
} from "@/lib/upcoming-export-columns";
import { upcomingExportBounds, type UpcomingExportBody } from "@/lib/upcoming-export-query";

/** Export upcoming bookings (future, pending/confirmed) as CSV. */
export async function GET(request: Request) {
  if (!(await getAuthUserFromRequest(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const { eventFrom, eventTo, statusIn } = upcomingExportBounds({});
  let qb = supabase
    .from("bookings")
    .select("booking_code, client_name, client_email, client_phone, event_date, event_slot_key, event_type, package_name, total_cents, status")
    .gte("event_date", eventFrom)
    .in("status", statusIn)
    .order("event_date", { ascending: true })
    .limit(500);
  if (eventTo) qb = qb.lte("event_date", eventTo);
  const { data: rows, error } = await qb;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return csvResponse(rows ?? [], UPCOMING_EXPORT_COLUMNS_DEFAULT, "upcoming-bookings.csv");
}

export async function POST(request: Request) {
  if (!(await getAuthUserFromRequest(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  let body: UpcomingExportBody & { columns?: Partial<UpcomingListExportColumns> } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { eventFrom, eventTo, statusIn } = upcomingExportBounds(body);
  const col: UpcomingListExportColumns = { ...UPCOMING_EXPORT_COLUMNS_DEFAULT, ...body.columns };
  let qb = supabase
    .from("bookings")
    .select("booking_code, client_name, client_email, client_phone, event_date, event_slot_key, event_type, package_name, total_cents, status")
    .gte("event_date", eventFrom)
    .in("status", statusIn)
    .order("event_date", { ascending: true })
    .limit(2000);
  if (eventTo) qb = qb.lte("event_date", eventTo);
  const { data: rows, error } = await qb;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const slug = `${eventFrom}${eventTo ? `-to-${eventTo}` : ""}`.replace(/[/\\]/g, "-");
  return csvResponse(rows ?? [], col, `upcoming-export-${slug}.csv`);
}

function csvResponse(rows: Record<string, unknown>[], col: UpcomingListExportColumns, filename: string) {
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const toPounds = (c: number | null) => (c == null ? "" : (c / 100).toFixed(2));
  const slot = (k: unknown) => (k == null || String(k).trim() === "" ? "Whole day" : String(k).replace(/_/g, " "));
  type R = Record<string, unknown>;
  const cells: { h: string; v: (r: R) => string }[] = [];
  if (col.code) cells.push({ h: "Code", v: (r) => String(r.booking_code ?? "") });
  if (col.client)
    cells.push({
      h: "Client",
      v: (r) =>
        [r.client_name || r.client_email, r.client_name ? r.client_email : ""].filter(Boolean).join(" · ") || "",
    });
  if (col.phone) cells.push({ h: "Phone", v: (r) => String(r.client_phone ?? "") });
  if (col.eventDate) cells.push({ h: "Event date", v: (r) => String(r.event_date ?? "") });
  if (col.slot) cells.push({ h: "Slot", v: (r) => slot(r.event_slot_key) });
  if (col.eventType) cells.push({ h: "Event type", v: (r) => String(r.event_type ?? "") });
  if (col.package) cells.push({ h: "Package", v: (r) => String(r.package_name ?? "") });
  if (col.total) cells.push({ h: "Total (£)", v: (r) => toPounds(r.total_cents as number | null) });
  if (col.status) cells.push({ h: "Status", v: (r) => String(r.status ?? "") });
  if (!cells.length) return NextResponse.json({ error: "Select at least one column" }, { status: 400 });
  const headerLine = cells.map((c) => escape(c.h)).join(",");
  const bodyLines = rows.map((r) => cells.map((c) => escape(c.v(r as R))).join(","));
  const csv = [headerLine, ...bodyLines].join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
