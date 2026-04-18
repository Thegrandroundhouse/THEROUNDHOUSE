/** Seeded / library templates — cannot be deleted; body merge tokens are protected on edit. */
export const AGREEMENT_SYSTEM_SLUGS = new Set([
  "venue-hire-default",
  "deposit-schedule",
  "balance-final",
  "supplier-access",
]);

/** Tokens that must stay exactly as-is in system templates (user can edit other text and other {{tags}}). */
export const AGREEMENT_LOCKED_PLACEHOLDERS = new Set([
  "{{venueName}}",
  "{{client_name}}",
  "{{event_date}}",
  "{{booking_code}}",
  "{{event_slot_label}}",
  "{{total_gbp}}",
]);
