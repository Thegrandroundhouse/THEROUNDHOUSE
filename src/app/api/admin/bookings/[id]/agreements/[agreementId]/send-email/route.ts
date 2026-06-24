import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-api";
import { composeAgreementEmail } from "@/lib/agreement-email-compose";
import { renderAgreementPdfBuffer } from "@/lib/render-agreement-pdf-buffer";
import { sendTransactionalEmail } from "@/lib/send-email";
import { writeAuditLog } from "@/lib/audit-log";
import { parseInvoiceBusinessValue } from "@/lib/invoice-business";
import { parseContractData } from "@/lib/build-banqueting-contract";

function formatEventDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso + "T12:00:00").toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatGbp(cents: number | null | undefined): string | undefined {
  if (cents == null || !Number.isFinite(cents)) return undefined;
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(cents / 100);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; agreementId: string }> },
) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  const { id: bookingId, agreementId } = await params;
  const supabase = auth.supabase;
  const body = await request.json().catch(() => ({}));

  const to = typeof body.to === "string" ? body.to.trim() : "";
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: "Valid recipient email is required" }, { status: 400 });
  }

  let pdfBuffer: Buffer;
  let filename: string;
  let row: { title: string | null; custom_values: unknown };
  let booking: Record<string, unknown>;
  try {
    const rendered = await renderAgreementPdfBuffer(supabase, bookingId, agreementId);
    pdfBuffer = rendered.buffer;
    filename = rendered.filename;
    row = rendered.row;
    booking = rendered.booking;
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not build PDF attachment" },
      { status: 500 },
    );
  }

  const { data: bizRow } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "invoice_business")
    .maybeSingle();
  const business = bizRow?.value ? parseInvoiceBusinessValue(bizRow.value) : null;
  const contract = parseContractData(row.custom_values);

  const defaults = composeAgreementEmail({
    clientName: String(booking.client_name || booking.client_email || "Client"),
    clientEmail: to,
    eventDateLabel: formatEventDate(booking.event_date as string),
    bookingCode: (booking.booking_code as string | null) ?? null,
    agreementTitle: String(row.title || "Hire agreement"),
    venueName: business?.venueName,
    venuePhone: business?.venuePhone,
    venueEmail: business?.venueEmail,
    salesRep: contract?.enquiry.salesRep && contract.enquiry.salesRep !== "—" ? contract.enquiry.salesRep : undefined,
    totalGbp: formatGbp(booking.total_cents as number | null),
  });

  const subject = typeof body.subject === "string" && body.subject.trim() ? body.subject.trim() : defaults.subject;
  const messageText = typeof body.message === "string" && body.message.trim() ? body.message.trim() : defaults.text;
  const html =
    typeof body.message === "string" && body.message.trim()
      ? `<div style="font-family: Georgia, serif; line-height: 1.6; white-space: pre-wrap;">${messageText.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>`
      : defaults.html;

  const includePdf = body.include_pdf !== false;
  const result = await sendTransactionalEmail({
    to,
    subject,
    html,
    text: messageText,
    replyTo: business?.venueEmail?.trim() || undefined,
    attachments: includePdf ? [{ filename, content: pdfBuffer }] : undefined,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, configured: result.configured },
      { status: result.configured ? 502 : 503 },
    );
  }

  await supabase.from("booking_communications").insert({
    booking_id: bookingId,
    channel: "email",
    direction: "out",
    subject,
    body: `Sent "${subject}" to ${to}${includePdf ? ` with PDF (${filename})` : ""}.`,
    sent_at: new Date().toISOString(),
  });

  await writeAuditLog(supabase, auth.user, {
    action: "email_sent",
    entity_type: "booking_agreement",
    entity_id: agreementId,
    booking_id: bookingId,
    summary: `Emailed agreement to ${to}`,
    metadata: { subject, filename: includePdf ? filename : null },
  });

  return NextResponse.json({ ok: true, id: result.id });
}
