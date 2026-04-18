import type { InvoiceBusinessPayload } from "@/app/api/admin/settings/invoice-business/route";

export type BookingMergeVars = {
  venueName: string;
  client_name: string;
  client_email: string;
  event_date: string;
  booking_code: string;
  event_slot_label: string;
  total_gbp: string;
};

export function mergeAgreementBody(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    const re = new RegExp(`\\{\\{\\s*${escapeRe(k)}\\s*\\}\\}`, "gi");
    out = out.replace(re, v ?? "");
  }
  return out;
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Placeholder merge for template editor live preview */
export const AGREEMENT_EDITOR_PREVIEW_VARS: Record<string, string> = {
  venueName: "The Roundhouse",
  client_name: "Alex & Jordan",
  client_email: "couple@example.com",
  event_date: "Saturday, 14 June 2026",
  booking_code: "RH-2026-0142",
  event_slot_label: "Evening · 17:00 – 22:00",
  total_gbp: "£12,500.00",
  event_type: "Wedding reception",
  package_name: "Full venue · premium",
  guest_count: "120",
  deposit_gbp: "£3,750.00",
  balance_gbp: "£8,750.00",
  vendors_list:
    "   • Bloom & Stem (florist)\n   • Sound & Light Co (AV)\n   • Chef's Table (catering)",
  payment_schedule:
    "   • Deposit 30%: £3,750.00 — paid — due 2026-01-15\n   • Balance: £8,750.00 — pending — due 2026-05-14",
  extras_block: "Extras & add-ons:\nEvening bar extension · sparklers package",
  special_requirements_block: "Special requirements:\nWheelchair access confirmed · vegan menu for 12 guests",
};

export function bookingToMergeVars(
  booking: {
    client_name?: string | null;
    client_email?: string | null;
    event_date?: string | null;
    booking_code?: string | null;
    total_cents?: number | null;
  },
  business: Pick<InvoiceBusinessPayload, "venueName"> | null,
  event_slot_label: string,
): BookingMergeVars {
  const total =
    booking.total_cents != null && Number.isFinite(booking.total_cents)
      ? `£${(booking.total_cents / 100).toFixed(2)}`
      : "—";
  return {
    venueName: business?.venueName || "The venue",
    client_name: booking.client_name || booking.client_email || "Client",
    client_email: booking.client_email || "",
    event_date: booking.event_date || "—",
    booking_code: booking.booking_code || "—",
    event_slot_label: event_slot_label || "Full venue / whole day",
    total_gbp: total,
  };
}
