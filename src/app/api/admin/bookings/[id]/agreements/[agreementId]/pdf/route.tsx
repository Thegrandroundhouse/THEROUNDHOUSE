import React from "react";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";
import { buildBookingAgreementPdfDocument } from "@/lib/render-booking-agreement-pdf";
import { parseInvoiceBusinessValue } from "@/lib/invoice-business";
import type { InvoiceBusinessPayload } from "@/lib/invoice-business";

function loadBusiness(v: unknown): InvoiceBusinessPayload | null {
  if (!v) return null;
  return parseInvoiceBusinessValue(v);
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string; agreementId: string }> }) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: bookingId, agreementId } = await params;
  const inline = new URL(request.url).searchParams.get("inline") === "1";
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const [{ data: row }, { data: booking }, { data: bizRow }] = await Promise.all([
    supabase.from("booking_agreements").select("*").eq("id", agreementId).eq("booking_id", bookingId).maybeSingle(),
    supabase.from("bookings").select("*").eq("id", bookingId).maybeSingle(),
    supabase.from("site_settings").select("value").eq("key", "invoice_business").maybeSingle(),
  ]);

  if (!row || !booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const templateId = row.template_id as string | null;
  const { data: templateRow } = templateId
    ? await supabase.from("agreement_templates").select("slug, body").eq("id", templateId).maybeSingle()
    : { data: null };

  const business = loadBusiness(bizRow?.value);

  let doc: React.ReactElement;
  try {
    doc = await buildBookingAgreementPdfDocument(supabase, {
      booking: booking as Record<string, unknown>,
      business,
      templateSlug: templateRow?.slug as string | undefined,
      templateBody: templateRow?.body ? String(templateRow.body) : null,
      agreementTitle: String(row.title || "Hire agreement"),
      renderedBody: String(row.rendered_body || ""),
      customValues: row.custom_values,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not build PDF" }, { status: 500 });
  }

  let buffer: Buffer;
  try {
    buffer = await renderToBuffer(doc as React.ReactElement<import("@react-pdf/renderer").DocumentProps>);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "PDF render failed" }, { status: 500 });
  }

  const safeName = String(row.title || "agreement")
    .replace(/[^a-z0-9]+/gi, "-")
    .slice(0, 48)
    .toLowerCase();
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${safeName}-${booking.booking_code || bookingId.slice(0, 8)}.pdf"`,
    },
  });
}
