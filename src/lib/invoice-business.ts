import {
  VENUE_ADDRESS,
  VENUE_LEGAL_NAME,
  LEGACY_VENUE_ADDRESS_PATTERNS,
} from "@/lib/venue-constants";

export type InvoiceBusinessPayload = {
  venueName: string;
  venueTagline: string;
  venueAddress: string;
  venuePhone: string;
  venueEmail: string;
  bankName: string;
  sortCode: string;
  accountNumber: string;
  accountName: string;
  paymentReference: string;
};

export const INVOICE_BUSINESS_DEFAULTS: InvoiceBusinessPayload = {
  venueName: VENUE_LEGAL_NAME,
  venueTagline: "Wedding & events venue",
  venueAddress: VENUE_ADDRESS,
  venuePhone: "",
  venueEmail: "",
  bankName: "",
  sortCode: "",
  accountNumber: "",
  accountName: VENUE_LEGAL_NAME,
  paymentReference: "Invoice number",
};

function applyVenueAddressDefaults(payload: InvoiceBusinessPayload): InvoiceBusinessPayload {
  const addr = payload.venueAddress.trim();
  const isLegacy = addr && LEGACY_VENUE_ADDRESS_PATTERNS.some((p) => addr.includes(p));
  if (!addr || isLegacy) {
    return { ...payload, venueAddress: VENUE_ADDRESS };
  }
  return payload;
}

/** Parse stored site_settings invoice_business JSON with venue address fallbacks. */
export function parseInvoiceBusinessValue(value: unknown): InvoiceBusinessPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...INVOICE_BUSINESS_DEFAULTS };
  }
  const o = value as Record<string, unknown>;
  const payload: InvoiceBusinessPayload = {
    venueName: typeof o.venueName === "string" ? o.venueName : INVOICE_BUSINESS_DEFAULTS.venueName,
    venueTagline: typeof o.venueTagline === "string" ? o.venueTagline : INVOICE_BUSINESS_DEFAULTS.venueTagline,
    venueAddress:
      typeof o.venueAddress === "string" && o.venueAddress.trim()
        ? o.venueAddress
        : INVOICE_BUSINESS_DEFAULTS.venueAddress,
    venuePhone: typeof o.venuePhone === "string" ? o.venuePhone : "",
    venueEmail: typeof o.venueEmail === "string" ? o.venueEmail : "",
    bankName: typeof o.bankName === "string" ? o.bankName : "",
    sortCode: typeof o.sortCode === "string" ? o.sortCode : "",
    accountNumber: typeof o.accountNumber === "string" ? o.accountNumber : "",
    accountName: typeof o.accountName === "string" ? o.accountName : INVOICE_BUSINESS_DEFAULTS.accountName,
    paymentReference:
      typeof o.paymentReference === "string" ? o.paymentReference : INVOICE_BUSINESS_DEFAULTS.paymentReference,
  };
  return applyVenueAddressDefaults(payload);
}

/** Normalize admin PUT body (no legacy address auto-fix on save). */
export function normalizeInvoiceBusinessBody(body: unknown): InvoiceBusinessPayload {
  if (!body || typeof body !== "object") return { ...INVOICE_BUSINESS_DEFAULTS };
  const o = body as Record<string, unknown>;
  return {
    venueName: typeof o.venueName === "string" ? o.venueName : INVOICE_BUSINESS_DEFAULTS.venueName,
    venueTagline: typeof o.venueTagline === "string" ? o.venueTagline : INVOICE_BUSINESS_DEFAULTS.venueTagline,
    venueAddress:
      typeof o.venueAddress === "string" && o.venueAddress.trim()
        ? o.venueAddress
        : INVOICE_BUSINESS_DEFAULTS.venueAddress,
    venuePhone: typeof o.venuePhone === "string" ? o.venuePhone : "",
    venueEmail: typeof o.venueEmail === "string" ? o.venueEmail : "",
    bankName: typeof o.bankName === "string" ? o.bankName : "",
    sortCode: typeof o.sortCode === "string" ? o.sortCode : "",
    accountNumber: typeof o.accountNumber === "string" ? o.accountNumber : "",
    accountName: typeof o.accountName === "string" ? o.accountName : INVOICE_BUSINESS_DEFAULTS.accountName,
    paymentReference:
      typeof o.paymentReference === "string" ? o.paymentReference : INVOICE_BUSINESS_DEFAULTS.paymentReference,
  };
}
