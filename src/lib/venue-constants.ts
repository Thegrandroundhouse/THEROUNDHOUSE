/** Official venue / registered address — The Roundhouse Banqueting Limited */
export const VENUE_ADDRESS = "Lodge Avenue, Dagenham, RM8 2HY";

export const VENUE_ADDRESS_LINES = ["The Roundhouse Banqueting Limited", "Lodge Avenue", "Dagenham", "RM8 2HY"] as const;

export const VENUE_LEGAL_NAME = "The Roundhouse Banqueting Limited";

export const VENUE_COMPANY_NUMBER = "16922830";

/** Public-facing location label (not North London — venue is in Dagenham, Essex). */
export const VENUE_LOCATION_LABEL = "Dagenham, Essex";

export const VENUE_WEBSITE = "www.theroundhousebanqueting.co.uk";

/** Admin CRM sidebar, login, and staff PDFs (not the public marketing site name). */
export const ADMIN_APP_NAME = "The Roundhouse Banqueting";
export const ADMIN_APP_TAGLINE = "Staff CRM";

/** Default when Settings → Business venue name is empty. */
export const ADMIN_VENUE_FALLBACK = ADMIN_APP_NAME;

/** Legacy wrong addresses — used when patching stored settings. */
export const LEGACY_VENUE_ADDRESS_PATTERNS = ["Advent Way", "N18 3AF", "North London", "Eley Road", "Meridian Grand"];
