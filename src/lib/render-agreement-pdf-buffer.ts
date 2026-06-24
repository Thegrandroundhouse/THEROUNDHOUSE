import type React from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { renderToBuffer } from "@react-pdf/renderer";
import { buildBookingAgreementPdfDocument } from "@/lib/render-booking-agreement-pdf";
import { parseInvoiceBusinessValue, type InvoiceBusinessPayload } from "@/lib/invoice-business";

export type AgreementPdfRow = {
  id: string;
  title: string | null;
  rendered_body: string | null;
  custom_values: unknown;
  template_id: string | null;
};

function loadBusiness(v: unknown): InvoiceBusinessPayload | null {
  if (!v) return null;
  return parseInvoiceBusinessValue(v);
}

export async function renderAgreementPdfBuffer(
  supabase: SupabaseClient,
  bookingId: string,
  agreementId: string,
): Promise<{
  buffer: Buffer;
  filename: string;
  row: AgreementPdfRow;
  booking: Record<string, unknown>;
}> {
  const [{ data: row }, { data: booking }, { data: bizRow }] = await Promise.all([
    supabase.from("booking_agreements").select("*").eq("id", agreementId).eq("booking_id", bookingId).maybeSingle(),
    supabase.from("bookings").select("*").eq("id", bookingId).maybeSingle(),
    supabase.from("site_settings").select("value").eq("key", "invoice_business").maybeSingle(),
  ]);

  if (!row || !booking) throw new Error("Agreement or booking not found");

  const templateId = row.template_id as string | null;
  const { data: templateRow } = templateId
    ? await supabase.from("agreement_templates").select("slug, body").eq("id", templateId).maybeSingle()
    : { data: null };

  const business = loadBusiness(bizRow?.value);
  const doc = await buildBookingAgreementPdfDocument(supabase, {
    booking: booking as Record<string, unknown>,
    business,
    templateSlug: templateRow?.slug as string | undefined,
    templateBody: templateRow?.body ? String(templateRow.body) : null,
    agreementTitle: String(row.title || "Hire agreement"),
    renderedBody: String(row.rendered_body || ""),
    customValues: row.custom_values,
  });

  const buffer = await renderToBuffer(doc as React.ReactElement<import("@react-pdf/renderer").DocumentProps>);
  const safeName = String(row.title || "agreement")
    .replace(/[^a-z0-9]+/gi, "-")
    .slice(0, 48)
    .toLowerCase();
  const bookingCode = (booking as { booking_code?: string | null }).booking_code;
  const filename = `${safeName}-${bookingCode || bookingId.slice(0, 8)}.pdf`;

  return {
    buffer,
    filename,
    row: row as AgreementPdfRow,
    booking: booking as Record<string, unknown>,
  };
}
