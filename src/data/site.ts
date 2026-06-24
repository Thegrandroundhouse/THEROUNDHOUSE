import type { SiteConfig } from "@/types/site";
import { VENUE_ADDRESS, VENUE_BRAND_NAME, VENUE_CONTACT_EMAIL } from "@/lib/venue-constants";

export const siteConfig: SiteConfig = {
  venueName: VENUE_BRAND_NAME,
  tagline: "A Luxury Wedding Venue Like No Other",
  phone: "020 3918 8999",
  email: VENUE_CONTACT_EMAIL,
  address: VENUE_ADDRESS,
};
