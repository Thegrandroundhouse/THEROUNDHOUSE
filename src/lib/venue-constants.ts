/** Venue registered address — The Grand Round House */
export const VENUE_ADDRESS = "Lodge Avenue, Dagenham, RM8 2HY";

export const VENUE_BRAND_NAME = "The Grand Round House";

export const VENUE_ADDRESS_LINES = [VENUE_BRAND_NAME, "Lodge Avenue", "Dagenham", "RM8 2HY"] as const;

/** Company name on contracts, invoices, bank details, and T&Cs. */
export const VENUE_LEGAL_NAME = VENUE_BRAND_NAME;

/** Primary contact email for the venue and outbound CRM mail. */
export const VENUE_CONTACT_EMAIL = "info@thegrandroundhouse.co.uk";

export const VENUE_COMPANY_NUMBER = "16922830";

/** Public-facing location label (not North London — venue is in Dagenham, Essex). */
export const VENUE_LOCATION_LABEL = "Dagenham, Essex";

export const VENUE_WEBSITE = "www.thegrandroundhouse.co.uk";

/** Admin CRM sidebar, login, and staff PDFs (not the public marketing site name). */
export const ADMIN_APP_NAME = VENUE_BRAND_NAME;
export const ADMIN_APP_TAGLINE = "Staff CRM";

/** Default when Settings → Business venue name is empty. */
export const ADMIN_VENUE_FALLBACK = VENUE_BRAND_NAME;

/** Agreement template display names (slugs unchanged for existing bookings). */
export const BANQUETING_HIRE_TEMPLATE_LABEL = `${VENUE_BRAND_NAME} — Hire contract`;
export const BANQUETING_TERMS_TEMPLATE_LABEL = `${VENUE_BRAND_NAME} — Terms & Conditions`;

/** Legacy wrong addresses — used when patching stored settings. */
export const LEGACY_VENUE_ADDRESS_PATTERNS = ["Advent Way", "N18 3AF", "North London", "Eley Road", "Meridian Grand"];
