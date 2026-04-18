import React from "react";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";
import { BookingsListPdfDocument, type ListExportColumns } from "@/lib/bookings-list-export-pdf";
import { BOOKINGS_EXPORT_COLUMNS_DEFAULT } from "@/lib/bookings-export-columns";

export async function POST(request: Request) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  let body: {
    event_date_from?: string;
    event_date_to?: string;
    status?: string;
    year?: string;
    columns?: Partial<ListExportColumns>;
  } = {};
  try {
    body = await request.json();
  } catch {
    /* use defaults */
  }

  const columns: ListExportColumns = { ...BOOKINGS_EXPORT_COLUMNS_DEFAULT, ...body.columns };
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

  let qb = supabase
    .from("bookings")
    .select("booking_code, client_name, client_email, client_phone, event_date, event_type, package_name, total_cents, deposit_cents, status")
    .order("event_date", { ascending: false });
  if (body.status && ["pending", "confirmed", "cancelled", "completed"].includes(body.status)) {
    qb = qb.eq("status", body.status);
  }
  if (eventDateFrom && /^\d{4}-\d{2}-\d{2}$/.test(eventDateFrom)) qb = qb.gte("event_date", eventDateFrom);
  if (eventDateTo && /^\d{4}-\d{2}-\d{2}$/.test(eventDateTo)) qb = qb.lte("event_date", eventDateTo);
  const { data: rows, error } = await qb.limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const venueName = process.env.NEXT_PUBLIC_SITE_NAME || "The Grand Roundhouse";
  const doc = (
    <BookingsListPdfDocument
      venueName={venueName}
      generatedAt={new Date().toLocaleString("en-GB")}
      bookings={(rows ?? []) as Parameters<typeof BookingsListPdfDocument>[0]["bookings"]}
      columns={columns}
      title={`Bookings ${eventDateFrom || ""} ${eventDateTo ? `to ${eventDateTo}` : ""}`.trim() || "Bookings export"}
    />
  );
  const buf = await renderToBuffer(doc);
  const filename = `bookings-export-${eventDateFrom || "all"}-${eventDateTo || "all"}.pdf`.replace(/\/|\\/g, "-");
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
