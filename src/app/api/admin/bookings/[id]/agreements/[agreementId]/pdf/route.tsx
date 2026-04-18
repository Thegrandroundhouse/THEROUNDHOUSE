import React from "react";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";
import { AgreementPdfDocument } from "@/lib/agreement-pdf-document";
import { getBookingSlotsConfig } from "@/lib/booking-slots";
import { loadAgreementMergeVars } from "@/lib/agreement-merge-load";
import type { InvoiceBusinessPayload } from "@/app/api/admin/settings/invoice-business/route";

function loadBusiness(v: unknown): InvoiceBusinessPayload | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, string>;
  return {
    venueName: String(o.venueName || ""),
    venueTagline: String(o.venueTagline || ""),
    venueAddress: String(o.venueAddress || ""),
    venuePhone: String(o.venuePhone || ""),
    venueEmail: String(o.venueEmail || ""),
    bankName: String(o.bankName || ""),
    sortCode: String(o.sortCode || ""),
    accountNumber: String(o.accountNumber || ""),
    accountName: String(o.accountName || ""),
    paymentReference: String(o.paymentReference || ""),
  };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; agreementId: string }> }) {
  const user = await getAuthUserFromRequest(_request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: bookingId, agreementId } = await params;
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const [{ data: row }, { data: booking }, { data: bizRow }] = await Promise.all([
    supabase.from("booking_agreements").select("*").eq("id", agreementId).eq("booking_id", bookingId).maybeSingle(),
    supabase.from("bookings").select("*").eq("id", bookingId).maybeSingle(),
    supabase.from("site_settings").select("value").eq("key", "invoice_business").maybeSingle(),
  ]);

  if (!row || !booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const business = loadBusiness(bizRow?.value);
  const config = await getBookingSlotsConfig(supabase);
  const slotKey = booking.event_slot_key as string | null;
  const event_slot_label =
    slotKey && String(slotKey).trim()
      ? (() => {
          const def = config.slots.find((s) => s.key === slotKey);
          return def ? `${def.label}${def.timeLabel ? ` · ${def.timeLabel}` : ""}` : slotKey;
        })()
      : "Full venue (whole day)";

  const totalGbp =
    booking.total_cents != null && Number.isFinite(booking.total_cents)
      ? `£${(booking.total_cents / 100).toFixed(2)}`
      : "—";
  const eventDate =
    booking.event_date && /^\d{4}-\d{2}-\d{2}$/.test(booking.event_date)
      ? new Date(booking.event_date + "T12:00:00").toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : String(booking.event_date || "—");

  const generatedAt = new Date().toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const { appendix } = await loadAgreementMergeVars(
    supabase,
    booking as Record<string, unknown>,
    business ? { venueName: business.venueName } : null,
    event_slot_label,
  );

  const doc = (
    <AgreementPdfDocument
      venueName={business?.venueName || "Venue"}
      venueTagline={business?.venueTagline || ""}
      agreementTitle={String(row.title || "Hire agreement")}
      clientName={String(booking.client_name || booking.client_email || "—")}
      clientEmail={String(booking.client_email || "")}
      eventDate={eventDate}
      eventSlotLabel={event_slot_label}
      bookingCode={String(booking.booking_code || bookingId.slice(0, 8).toUpperCase())}
      totalGbp={totalGbp}
      bodyText={String(row.rendered_body || "")}
      generatedAt={generatedAt}
      appendix={appendix}
    />
  );

  let buffer: Buffer;
  try {
    buffer = await renderToBuffer(doc);
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
      "Content-Disposition": `attachment; filename="${safeName}-${booking.booking_code || bookingId.slice(0, 8)}.pdf"`,
    },
  });
}
