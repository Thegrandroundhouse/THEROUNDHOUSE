import React from "react";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";
import { EnquiriesListPdfDocument, type EnquiryExportRow } from "@/lib/enquiries-list-export-pdf";
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
  return qb.limit(500);
}

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
  return pdfResponse(rows ?? [], ENQUIRIES_EXPORT_COLUMNS_DEFAULT, "enquiries-export.pdf", "Enquiries export");
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
  return pdfResponse(
    rows ?? [],
    col,
    `enquiries-export-${slug.replace(/[/\\]/g, "-")}.pdf`,
    "Enquiries export",
  );
}

async function pdfResponse(
  rows: Record<string, unknown>[],
  col: EnquiriesListExportColumns,
  filename: string,
  title: string,
) {
  const venueName = process.env.NEXT_PUBLIC_SITE_NAME || "The Grand Roundhouse";
  const doc = (
    <EnquiriesListPdfDocument
      venueName={venueName}
      generatedAt={new Date().toLocaleString("en-GB")}
      enquiries={rows as EnquiryExportRow[]}
      title={title}
      columns={col}
    />
  );
  const buf = await renderToBuffer(doc);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
