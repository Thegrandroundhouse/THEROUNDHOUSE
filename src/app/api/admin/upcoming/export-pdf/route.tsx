import React from "react";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";
import { UpcomingListPdfDocument } from "@/lib/upcoming-list-export-pdf";
import {
  UPCOMING_EXPORT_COLUMNS_DEFAULT,
  type UpcomingListExportColumns,
} from "@/lib/upcoming-export-columns";
import { ADMIN_VENUE_FALLBACK } from "@/lib/venue-constants";
import { upcomingExportBounds, type UpcomingExportBody } from "@/lib/upcoming-export-query";

/** Export upcoming bookings (future, pending/confirmed) as PDF. */
export async function GET() {
  return NextResponse.json({ error: "Use POST" }, { status: 405 });
}

export async function POST(request: Request) {
  if (!(await getAuthUserFromRequest(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  let body: UpcomingExportBody & { columns?: Partial<UpcomingListExportColumns> } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const { eventFrom, eventTo, statusIn } = upcomingExportBounds(body);
  const col: UpcomingListExportColumns = { ...UPCOMING_EXPORT_COLUMNS_DEFAULT, ...body.columns };
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

  const venueName = process.env.NEXT_PUBLIC_SITE_NAME || ADMIN_VENUE_FALLBACK;
  const doc = (
    <UpcomingListPdfDocument
      venueName={venueName}
      generatedAt={new Date().toLocaleString("en-GB")}
      rows={(rows ?? []) as Parameters<typeof UpcomingListPdfDocument>[0]["rows"]}
      columns={col}
      title="Upcoming bookings"
    />
  );
  const buf = await renderToBuffer(doc);
  const slug = `${eventFrom}${eventTo ? `-to-${eventTo}` : ""}`.replace(/[/\\]/g, "-");
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="upcoming-export-${slug}.pdf"`,
    },
  });
}
