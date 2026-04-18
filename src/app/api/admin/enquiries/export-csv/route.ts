import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";
import {
  ENQUIRIES_EXPORT_COLUMNS_DEFAULT,
  type EnquiriesListExportColumns,
} from "@/lib/enquiries-export-columns";
import { enquiriesEventBounds, type EnquiriesExportBody } from "@/lib/enquiries-export-query";

const SELECT =
  "name, email, phone, function_type, hear_about, message, status, notes, follow_up_notes, last_contact_at, created_at, event_date, event_slot_key";

function buildQuery(
  supabase: NonNullable<ReturnType<typeof import("@/lib/admin-api").getAdminClient>>,
  body: EnquiriesExportBody,
) {
  const { from, to } = enquiriesEventBounds(body);
  const status = body.status;
  let qb = supabase.from("enquiries").select(SELECT).order("created_at", { ascending: false });
  if (status && ["new", "contacted", "quoted", "converted", "lost"].includes(status)) {
    qb = qb.eq("status", status);
  }
  if (from && to) {
    qb = qb.not("event_date", "is", null).gte("event_date", from).lte("event_date", to);
  }
  return qb.limit(5000);
}

/** Export enquiries as CSV. */
export async function GET(request: Request) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;
  const event_date_from = searchParams.get("event_date_from") || undefined;
  const event_date_to = searchParams.get("event_date_to") || undefined;
  let body: EnquiriesExportBody = { date_mode: "all", status };
  if (event_date_from && event_date_to) {
    body = { date_mode: "range", event_date_from, event_date_to, status };
  }
  const { data: rows, error } = await buildQuery(supabase, body);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return csvFromRows(rows ?? [], ENQUIRIES_EXPORT_COLUMNS_DEFAULT, "enquiries-export.csv");
}

export async function POST(request: Request) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  let body: EnquiriesExportBody & { columns?: Partial<EnquiriesListExportColumns> } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const col: EnquiriesListExportColumns = { ...ENQUIRIES_EXPORT_COLUMNS_DEFAULT, ...body.columns };
  const { data: rows, error } = await buildQuery(supabase, body);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { from, to } = enquiriesEventBounds(body);
  const slug =
    body.date_mode === "year" && body.year
      ? body.year
      : from && to
        ? `${from}-to-${to}`
        : "all";
  return csvFromRows(rows ?? [], col, `enquiries-export-${slug.replace(/[/\\]/g, "-")}.csv`);
}

function csvFromRows(rows: Record<string, unknown>[], col: EnquiriesListExportColumns, filename: string) {
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  type R = Record<string, unknown>;
  const cells: { h: string; v: (r: R) => string }[] = [];
  if (col.name) cells.push({ h: "Name", v: (r) => String(r.name ?? "") });
  if (col.email) cells.push({ h: "Email", v: (r) => String(r.email ?? "") });
  if (col.phone) cells.push({ h: "Phone", v: (r) => String(r.phone ?? "") });
  if (col.functionType) cells.push({ h: "Function type", v: (r) => String(r.function_type ?? "") });
  if (col.eventDate) cells.push({ h: "Event date", v: (r) => String(r.event_date ?? "") });
  if (col.slot)
    cells.push({
      h: "Time slot",
      v: (r) => (r.event_slot_key ? String(r.event_slot_key).replace(/_/g, " ") : ""),
    });
  if (col.hearAbout) cells.push({ h: "Hear about", v: (r) => String(r.hear_about ?? "") });
  if (col.message) cells.push({ h: "Message", v: (r) => String(r.message ?? "") });
  if (col.status) cells.push({ h: "Status", v: (r) => String(r.status ?? "") });
  if (col.notes) cells.push({ h: "Notes", v: (r) => String(r.notes ?? "") });
  if (col.followUp) cells.push({ h: "Follow-up notes", v: (r) => String(r.follow_up_notes ?? "") });
  if (col.lastContact) cells.push({ h: "Last contact", v: (r) => String(r.last_contact_at ?? "") });
  if (col.created) cells.push({ h: "Created", v: (r) => String(r.created_at ?? "") });
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
