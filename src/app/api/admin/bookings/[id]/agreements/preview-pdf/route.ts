import React from "react";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";
import { ensureBanquetingTemplates, isBanquetingHireSlug } from "@/lib/banqueting-templates-seed";
import { buildBookingAgreementPdfDocument } from "@/lib/render-booking-agreement-pdf";
import { applyLineItemTotalsToContract, parseContractData } from "@/lib/build-banqueting-contract";
import type { InvoiceBusinessPayload } from "@/lib/invoice-business";
import { parseInvoiceBusinessValue } from "@/lib/invoice-business";

function loadBusiness(v: unknown): InvoiceBusinessPayload | null {
  if (!v) return null;
  return parseInvoiceBusinessValue(v);
}

function pdfResponse(buffer: Buffer, filename: string, inline: boolean) {
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
    },
  });
}

/** Preview PDF before saving an agreement (all template types). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: bookingId } = await params;
  const body = await request.json().catch(() => ({}));
  const templateId = String(body.template_id || "").trim();
  if (!templateId) return NextResponse.json({ error: "template_id required" }, { status: 400 });

  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  await ensureBanquetingTemplates(supabase);

  const [{ data: booking }, { data: tmpl }, { data: bizRow }] = await Promise.all([
    supabase.from("bookings").select("*").eq("id", bookingId).maybeSingle(),
    supabase.from("agreement_templates").select("*").eq("id", templateId).maybeSingle(),
    supabase.from("site_settings").select("value").eq("key", "invoice_business").maybeSingle(),
  ]);

  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (!tmpl) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  const business = loadBusiness(bizRow?.value);
  const slug = String(tmpl.slug || "");
  const parsedContract = parseContractData(body.contract);
  const contractOverride = parsedContract ? applyLineItemTotalsToContract(parsedContract) : null;

  const title = isBanquetingHireSlug(slug)
    ? `Hire contract — ${(booking as { client_name?: string }).client_name || "Client"}`
    : String(tmpl.name);

  let doc: React.ReactElement;
  try {
    doc = await buildBookingAgreementPdfDocument(supabase, {
      booking: booking as Record<string, unknown>,
      business,
      templateSlug: slug,
      templateBody: String(tmpl.body || ""),
      agreementTitle: title,
      contractOverride,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not build preview" }, { status: 500 });
  }

  let buffer: Buffer;
  try {
    buffer = await renderToBuffer(doc as React.ReactElement<import("@react-pdf/renderer").DocumentProps>);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "PDF render failed" }, { status: 500 });
  }

  const safeName = title
    .replace(/[^a-z0-9]+/gi, "-")
    .slice(0, 48)
    .toLowerCase();
  return pdfResponse(buffer, `${safeName}-preview.pdf`, true);
}
