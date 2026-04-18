import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";
import { getBookingSlotsConfig } from "@/lib/booking-slots";
import { mergeAgreementBody, AGREEMENT_EDITOR_PREVIEW_VARS } from "@/lib/agreement-merge";
import type { InvoiceBusinessPayload } from "@/app/api/admin/settings/invoice-business/route";
import { loadAgreementMergeVars } from "@/lib/agreement-merge-load";

export async function POST(request: Request) {
  if (!(await getAuthUserFromRequest(request)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const bookingId = String(body.booking_id || "").trim();
  const bodyTemplate = String(body.body || "");
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const tpl =
    bodyTemplate ||
    "Preview: {{client_name}} · {{event_date}} · {{booking_code}} · {{total_gbp}} · {{package_name}}";

  if (!bookingId) {
    const merged = mergeAgreementBody(tpl, AGREEMENT_EDITOR_PREVIEW_VARS);
    return NextResponse.json({
      merged,
      vars: AGREEMENT_EDITOR_PREVIEW_VARS,
      booking_summary: null,
      sample: true,
    });
  }

  const { data: booking, error } = await supabase.from("bookings").select("*").eq("id", bookingId).maybeSingle();
  if (error || !booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  const { data: row } = await supabase.from("site_settings").select("value").eq("key", "invoice_business").maybeSingle();
  const v = row?.value as Record<string, string> | undefined;
  const business: Pick<InvoiceBusinessPayload, "venueName"> | null =
    v && typeof v === "object" ? { venueName: String(v.venueName || "") } : null;

  const config = await getBookingSlotsConfig(supabase);
  const slotKey = booking.event_slot_key as string | null;
  const event_slot_label =
    slotKey && String(slotKey).trim()
      ? (() => {
          const def = config.slots.find((s) => s.key === slotKey);
          return def ? `${def.label}${def.timeLabel ? ` · ${def.timeLabel}` : ""}` : slotKey;
        })()
      : "Full venue (whole day)";

  const { vars } = await loadAgreementMergeVars(supabase, booking as Record<string, unknown>, business, event_slot_label);
  const merged = mergeAgreementBody(tpl, vars);
  return NextResponse.json({
    merged,
    vars,
    booking_summary: {
      client_name: booking.client_name as string | null,
      event_date: booking.event_date as string | null,
      booking_code: (booking as { booking_code?: string | null }).booking_code ?? null,
    },
  });
}
