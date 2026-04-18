import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";
import {
  BOOKINGS_EXPORT_COLUMNS_DEFAULT,
  type BookingsListExportColumns,
} from "@/lib/bookings-export-columns";

/** Export bookings as CSV. Uses same filters as list (event_date, status). */
export async function GET(request: Request) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const year = searchParams.get("year");
  let eventDateFrom = searchParams.get("event_date_from");
  let eventDateTo = searchParams.get("event_date_to");
  if (year && /^\d{4}$/.test(year)) {
    eventDateFrom = `${year}-01-01`;
    eventDateTo = `${year}-12-31`;
  }

  let qb = supabase.from("bookings").select("id, booking_code, client_name, client_email, client_phone, event_date, event_type, package_name, total_cents, deposit_cents, balance_cents, status, special_requirements, notes, created_at").order("event_date", { ascending: false });
  if (status && ["pending", "confirmed", "cancelled", "completed"].includes(status)) {
    qb = qb.eq("status", status);
  }
  if (eventDateFrom && /^\d{4}-\d{2}-\d{2}$/.test(eventDateFrom)) qb = qb.gte("event_date", eventDateFrom);
  if (eventDateTo && /^\d{4}-\d{2}-\d{2}$/.test(eventDateTo)) qb = qb.lte("event_date", eventDateTo);
  const { data: rows, error } = await qb.limit(5000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const headers = [
    "Code",
    "Client name",
    "Client email",
    "Client phone",
    "Event date",
    "Event type",
    "Package",
    "Total (£)",
    "Deposit (£)",
    "Balance (£)",
    "Status",
    "Special requirements",
    "Internal notes",
    "Created",
  ];
  const toPounds = (c: number | null) => (c == null ? "" : (c / 100).toFixed(2));
  const body = (rows ?? []).map((r: Record<string, unknown>) =>
    [
      r.booking_code,
      r.client_name,
      r.client_email,
      r.client_phone,
      r.event_date,
      r.event_type,
      r.package_name,
      toPounds(r.total_cents as number | null),
      toPounds(r.deposit_cents as number | null),
      toPounds(r.balance_cents as number | null),
      r.status,
      r.special_requirements,
      r.notes,
      r.created_at,
    ].map(escape).join(","),
  );
  const csv = [headers.map(escape).join(","), ...body].join("\r\n");
  const filename = `bookings-export-${eventDateFrom || "all"}-${eventDateTo || "all"}.csv`.replace(/\/|\\/g, "-");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

/** Column-filtered CSV (matches export modal). */
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
    columns?: Partial<BookingsListExportColumns>;
  } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const col: BookingsListExportColumns = { ...BOOKINGS_EXPORT_COLUMNS_DEFAULT, ...body.columns };
  const status = body.status;
  let eventDateFrom = body.event_date_from;
  let eventDateTo = body.event_date_to;
  const hasRange =
    eventDateFrom &&
    eventDateTo &&
    /^\d{4}-\d{2}-\d{2}$/.test(eventDateFrom) &&
    /^\d{4}-\d{2}-\d{2}$/.test(eventDateTo);
  if (hasRange) {
    /* custom range wins */
  } else if (body.year && /^\d{4}$/.test(body.year)) {
    eventDateFrom = `${body.year}-01-01`;
    eventDateTo = `${body.year}-12-31`;
  }

  let qb = supabase
    .from("bookings")
    .select("booking_code, client_name, client_email, client_phone, event_date, event_type, package_name, total_cents, deposit_cents, status")
    .order("event_date", { ascending: false });
  if (status && ["pending", "confirmed", "cancelled", "completed"].includes(status)) {
    qb = qb.eq("status", status);
  }
  if (eventDateFrom && /^\d{4}-\d{2}-\d{2}$/.test(eventDateFrom)) qb = qb.gte("event_date", eventDateFrom);
  if (eventDateTo && /^\d{4}-\d{2}-\d{2}$/.test(eventDateTo)) qb = qb.lte("event_date", eventDateTo);
  const { data: rows, error } = await qb.limit(5000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const toPounds = (c: number | null) => (c == null ? "" : (c / 100).toFixed(2));

  type R = Record<string, unknown>;
  const cells: { key: keyof BookingsListExportColumns; h: string; v: (r: R) => string }[] = [];
  if (col.code) cells.push({ key: "code", h: "Code", v: (r) => String(r.booking_code ?? "") });
  if (col.client)
    cells.push({
      key: "client",
      h: "Client",
      v: (r) =>
        [r.client_name || r.client_email, r.client_name ? r.client_email : ""].filter(Boolean).join(" · ") || "",
    });
  if (col.phone) cells.push({ key: "phone", h: "Phone", v: (r) => String(r.client_phone ?? "") });
  if (col.eventDate) cells.push({ key: "eventDate", h: "Event date", v: (r) => String(r.event_date ?? "") });
  if (col.eventType) cells.push({ key: "eventType", h: "Event type", v: (r) => String(r.event_type ?? "") });
  if (col.package) cells.push({ key: "package", h: "Package", v: (r) => String(r.package_name ?? "") });
  if (col.total) cells.push({ key: "total", h: "Total (£)", v: (r) => toPounds(r.total_cents as number | null) });
  if (col.deposit) cells.push({ key: "deposit", h: "Deposit (£)", v: (r) => toPounds(r.deposit_cents as number | null) });
  if (col.status) cells.push({ key: "status", h: "Status", v: (r) => String(r.status ?? "") });

  if (!cells.length) return NextResponse.json({ error: "Select at least one column" }, { status: 400 });

  const headerLine = cells.map((c) => escape(c.h)).join(",");
  const bodyLines = (rows ?? []).map((r) => cells.map((c) => escape(c.v(r as R))).join(","));
  const csv = [headerLine, ...bodyLines].join("\r\n");
  const filename = `bookings-export-${eventDateFrom || "all"}-${eventDateTo || "all"}.csv`.replace(/\/|\\/g, "-");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
