import React from "react";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";
import {
  BookingExportPdfDocument,
  type ExportSections,
  type InvoiceBusinessBlock,
} from "@/lib/booking-export-pdf";
import { writeAuditLog } from "@/lib/audit-log";
import { getBookingSlotsConfig } from "@/lib/booking-slots";

const DEFAULT_SECTIONS: ExportSections = {
  client: true,
  event: true,
  money: true,
  notes: true,
  wedding: true,
  payments: true,
  tasks: true,
  vendors: true,
  documents: true,
  comms: true,
  record: true,
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: bookingId } = await params;
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  let body: { sections?: Partial<ExportSections> } = {};
  try {
    body = await request.json();
  } catch {
    /* default sections */
  }
  const sections: ExportSections = { ...DEFAULT_SECTIONS, ...body.sections };

  const { data: booking, error: bErr } = await supabase.from("bookings").select("*").eq("id", bookingId).maybeSingle();
  if (bErr || !booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  let workspace: Parameters<typeof BookingExportPdfDocument>[0]["workspace"] = null;
  let spaceName: string | null = null;
  try {
    const [wedding, milestones, tasks, documents, communications, vendorLinks, spaces] = await Promise.all([
      supabase.from("booking_wedding_details").select("*").eq("booking_id", bookingId).maybeSingle(),
      supabase.from("booking_payment_milestones").select("*").eq("booking_id", bookingId).order("sort_order"),
      supabase.from("booking_tasks").select("*").eq("booking_id", bookingId).order("sort_order"),
      supabase.from("booking_documents").select("*").eq("booking_id", bookingId).order("created_at", { ascending: false }),
      supabase.from("booking_communications").select("*").eq("booking_id", bookingId).order("sent_at", { ascending: false }),
      supabase.from("booking_vendors").select("vendor_id, role, vendors(id, name, vendor_type)").eq("booking_id", bookingId),
      supabase.from("venue_spaces").select("id, name, slug").order("sort_order"),
    ]);
    const wid = (booking as { space_id?: string | null }).space_id;
    if (wid && spaces.data) {
      const sp = spaces.data.find((s: { id: string }) => s.id === wid);
      spaceName = sp?.name ?? null;
    }
    workspace = {
      wedding: wedding.data || null,
      milestones: milestones.data ?? [],
      tasks: tasks.data ?? [],
      documents: documents.data ?? [],
      communications: communications.data ?? [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      bookingVendors: (vendorLinks.data ?? []) as any,
      spaces: spaces.data ?? [],
    };
  } catch {
    workspace = null;
  }

  const slotConfig = await getBookingSlotsConfig(supabase);
  const slotKey = (booking as { event_slot_key?: string | null }).event_slot_key;
  let event_slot_label: string | null = null;
  if (slotKey && String(slotKey).trim()) {
    const def = slotConfig.slots.find((s) => s.key === slotKey);
    event_slot_label = def ? `${def.label}${def.timeLabel ? ` · ${def.timeLabel}` : ""}` : String(slotKey).replace(/_/g, " ");
  }

  const venueName = process.env.NEXT_PUBLIC_SITE_NAME || "The Grand Roundhouse";
  let business: InvoiceBusinessBlock | null = null;
  try {
    const { data: row } = await supabase.from("site_settings").select("value").eq("key", "invoice_business").maybeSingle();
    const v = row?.value as Record<string, string> | undefined;
    if (v && typeof v === "object") {
      business = {
        venueName: String(v.venueName || venueName),
        venueTagline: String(v.venueTagline || ""),
        venueAddress: String(v.venueAddress || ""),
        venuePhone: String(v.venuePhone || ""),
        venueEmail: String(v.venueEmail || ""),
        bankName: String(v.bankName || ""),
        sortCode: String(v.sortCode || ""),
        accountNumber: String(v.accountNumber || ""),
        accountName: String(v.accountName || ""),
        paymentReference: String(v.paymentReference || ""),
      };
    }
  } catch {
    business = null;
  }
  const bookingCode = (booking as { booking_code?: string | null }).booking_code ?? null;
  const doc = (
    <BookingExportPdfDocument
      venueName={business?.venueName || venueName}
      business={business}
      generatedAt={new Date().toLocaleString("en-GB")}
      bookingId={booking.id}
      bookingCode={bookingCode}
      sections={sections}
      booking={{
        client_name: booking.client_name,
        client_email: booking.client_email,
        client_phone: booking.client_phone,
        event_date: booking.event_date,
        event_type: booking.event_type,
        package_name: booking.package_name,
        status: booking.status,
        total_cents: booking.total_cents,
        deposit_cents: booking.deposit_cents,
        balance_cents: booking.balance_cents,
        special_requirements: booking.special_requirements,
        notes: booking.notes,
        created_at: booking.created_at,
        updated_at: booking.updated_at,
        enquiry_id: booking.enquiry_id,
        event_slot_label,
      }}
      workspace={workspace}
      spaceName={spaceName}
    />
  );

  try {
    const buffer = await renderToBuffer(doc);
    await writeAuditLog(supabase, user, {
      action: "pdf_generated",
      entity_type: "booking",
      entity_id: bookingId,
      booking_id: bookingId,
      summary: `Exported PDF for ${booking.client_name || booking.client_email} · ${booking.event_date}`,
      metadata: {
        sections: (Object.entries(sections) as [keyof ExportSections, boolean][])
          .filter(([, v]) => v)
          .map(([k]) => k),
      },
    });
    const code = (booking as { booking_code?: string | null }).booking_code;
    const safeName = (code || booking.client_name || "booking").replace(/[^a-z0-9-_]/gi, "_").slice(0, 40);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="booking-${safeName}.pdf"`,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "PDF export failed" }, { status: 500 });
  }
}
