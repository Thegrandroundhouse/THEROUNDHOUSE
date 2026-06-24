import React from "react";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";
import { InvoicePdfDocument, type InvoiceLinePdf } from "@/lib/invoice-pdf";
import { VENUE_ADDRESS, ADMIN_VENUE_FALLBACK } from "@/lib/venue-constants";
import { parseInvoiceBusinessValue } from "@/lib/invoice-business";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAuthUserFromRequest(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const { data: inv, error } = await supabase.from("invoices").select("*").eq("id", id).maybeSingle();
  if (error || !inv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rawLines = Array.isArray(inv.line_items) ? inv.line_items : [];
  const lineItems: InvoiceLinePdf[] = rawLines.map((row: Record<string, unknown>) => {
    const qty = Math.max(1, Number(row.quantity) || 1);
    const unit = Number(row.unit_cents ?? row.amount_cents ?? 0) || 0;
    const lineTotal = Number(row.line_total_cents) || unit * qty;
    return {
      description: String(row.description || row.label || "Item"),
      detail: row.detail ? String(row.detail) : undefined,
      quantity: qty,
      unit_cents: unit,
      line_total_cents: lineTotal,
    };
  });
  if (!lineItems.length) {
    lineItems.push({
      description: "Venue & services",
      quantity: 1,
      unit_cents: inv.amount_cents || 0,
      line_total_cents: inv.amount_cents || 0,
    });
  }

  const subtotal = inv.subtotal_cents ?? lineItems.reduce((s, l) => s + l.line_total_cents, 0);
  const tax = inv.tax_cents ?? 0;
  const total = inv.amount_cents ?? subtotal + tax;

  const { data: businessRow } = await supabase.from("site_settings").select("value").eq("key", "invoice_business").maybeSingle();
  const biz = businessRow?.value && typeof businessRow.value === "object" && !Array.isArray(businessRow.value)
    ? (businessRow.value as Record<string, unknown>)
    : null;
  const business = biz ? parseInvoiceBusinessValue(biz) : null;
  const venueName = business?.venueName || process.env.NEXT_PUBLIC_SITE_NAME || ADMIN_VENUE_FALLBACK;
  const venueTagline = business?.venueTagline || "Wedding & events venue";
  const venueAddress = business?.venueAddress || process.env.INVOICE_VENUE_ADDRESS || VENUE_ADDRESS;
  const venuePhone = business?.venuePhone || "";
  const venueEmail = business?.venueEmail || "";
  const bankName = business?.bankName || "";
  const sortCode = business?.sortCode || "";
  const accountNumber = business?.accountNumber || "";
  const accountName = business?.accountName || "";
  const paymentReference = (biz?.paymentReference as string) || "";

  let logoUrl: string | null = inv.logo_url || null;
  if (!logoUrl) {
    const { data: setting } = await supabase.from("site_settings").select("value").eq("key", "invoice_logo_url").maybeSingle();
    const v = setting?.value;
    if (typeof v === "string") logoUrl = v;
  }

  const doc = (
    <InvoicePdfDocument
      invoiceNumber={inv.invoice_number}
      issuedDate={inv.issued_date || inv.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10)}
      dueDate={inv.due_date || null}
      status={inv.status}
      clientName={inv.client_name || "Client"}
      clientEmail={inv.client_email || ""}
      clientAddress={inv.client_address}
      venueName={venueName}
      venueTagline={venueTagline}
      venueAddress={venueAddress || undefined}
      venuePhone={venuePhone || undefined}
      venueEmail={venueEmail || undefined}
      bankName={bankName || undefined}
      sortCode={sortCode || undefined}
      accountNumber={accountNumber || undefined}
      accountName={accountName || undefined}
      paymentReference={paymentReference || undefined}
      lineItems={lineItems}
      subtotalCents={subtotal}
      taxCents={tax}
      totalCents={total}
      notes={inv.notes}
      bookingRef={inv.booking_id ? String(inv.booking_id).slice(0, 8) : null}
      logoUrl={logoUrl || undefined}
    />
  );

  try {
    const buffer = await renderToBuffer(doc);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${inv.invoice_number}.pdf"`,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "PDF failed" }, { status: 500 });
  }
}
