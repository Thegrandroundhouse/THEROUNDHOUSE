/** Standard supplier categories (stored lowercase snake_case on `vendors.vendor_type`). */
export const VENDOR_TYPE_OPTIONS: readonly { value: string; label: string }[] = [
  { value: "photographer", label: "Photographer" },
  { value: "videographer", label: "Videographer" },
  { value: "second_shooter", label: "Second shooter / assistant" },
  { value: "florist", label: "Florist" },
  { value: "dj", label: "DJ" },
  { value: "live_band", label: "Live band" },
  { value: "acoustic_musician", label: "Acoustic musician / soloist" },
  { value: "string_quartet", label: "String quartet / ensemble" },
  { value: "master_of_ceremonies", label: "Master of ceremonies" },
  { value: "celebrant", label: "Celebrant" },
  { value: "officiant", label: "Officiant" },
  { value: "wedding_planner", label: "Wedding planner" },
  { value: "day_coordinator", label: "On-the-day coordinator" },
  { value: "caterer", label: "Caterer" },
  { value: "private_chef", label: "Private chef" },
  { value: "bar_drinks", label: "Bar & drinks" },
  { value: "cake_designer", label: "Cake designer" },
  { value: "dessert_vendor", label: "Desserts & sweets" },
  { value: "coffee_cart", label: "Coffee cart" },
  { value: "makeup_artist", label: "Makeup artist" },
  { value: "hair_stylist", label: "Hair stylist" },
  { value: "bridalwear", label: "Bridalwear / dress boutique" },
  { value: "suit_hire", label: "Suits & formal hire" },
  { value: "jeweller", label: "Jeweller / rings" },
  { value: "stationery", label: "Stationery" },
  { value: "calligrapher", label: "Calligrapher" },
  { value: "venue", label: "Venue" },
  { value: "marquee_tipis", label: "Marquee & tipis" },
  { value: "furniture_hire", label: "Furniture hire" },
  { value: "linen_tableware", label: "Linen & tableware hire" },
  { value: "lighting", label: "Lighting design" },
  { value: "sound_av", label: "Sound & AV" },
  { value: "production", label: "Production / staging" },
  { value: "transport", label: "Transport" },
  { value: "chauffeur", label: "Chauffeur / wedding car" },
  { value: "photo_booth", label: "Photo booth" },
  { value: "magician", label: "Magician / close-up" },
  { value: "entertainment", label: "Entertainment (other)" },
  { value: "fireworks", label: "Fireworks / pyro" },
  { value: "security", label: "Security" },
  { value: "babysitting", label: "Childcare / babysitting" },
  { value: "hotel_accommodation", label: "Hotel & accommodation" },
  { value: "travel_agent", label: "Travel & honeymoon" },
  { value: "hen_stag_events", label: "Hen & stag events" },
  { value: "decorator", label: "Decorator / stylist" },
  { value: "videography_drone", label: "Drone footage" },
  { value: "ice_cream_cart", label: "Ice cream cart" },
  { value: "grazing_table", label: "Grazing table / platters" },
  { value: "wedding_insurance", label: "Wedding insurance" },
  { value: "other", label: "Other (generic)" },
] as const;

export const VENDOR_TYPE_CUSTOM = "__custom__";

export const VENDOR_TYPE_VALUE_SET = new Set(VENDOR_TYPE_OPTIONS.map((o) => o.value));

export function labelForVendorType(v: string): string {
  const x = VENDOR_TYPE_OPTIONS.find((o) => o.value === v);
  if (x) return x.label;
  return v
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim() || v;
}
