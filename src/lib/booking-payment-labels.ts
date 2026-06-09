import {
  buildPaymentScheduleFromTemplate,
  DEFAULT_PAYMENT_SCHEDULE_TEMPLATE,
} from "@/lib/hire-contract-settings";

/** Labels for recording money received — aligned with hire contract instalments. */
export const BOOKING_PAYMENT_LABELS = [
  { value: "Deposit", label: "Deposit (non-refundable)" },
  { value: "On Booking Confirmation", label: "On booking confirmation (25%)" },
  { value: "6 months before function", label: "6 months before function (25%)" },
  { value: "4 months before function", label: "4 months before function (25%)" },
  { value: "2 months before function", label: "2 months before function (25%)" },
  { value: "Balance", label: "Balance due" },
  { value: "Full hall hire", label: "Full hall hire (paid in full)" },
  { value: "Payment", label: "Other payment" },
] as const;

export function hireInstalmentPreview(totalCents: number) {
  if (totalCents <= 0) return [];
  return buildPaymentScheduleFromTemplate(totalCents, DEFAULT_PAYMENT_SCHEDULE_TEMPLATE);
}

export function firstInstalmentCents(totalCents: number): number | null {
  const rows = hireInstalmentPreview(totalCents);
  const first = rows.find((r) => r.amountCents > 0);
  return first?.amountCents ?? null;
}
