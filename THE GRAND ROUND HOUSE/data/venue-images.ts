/**
 * Single source of truth for venue image paths.
 * All photos live in public/images/venue/ and are served at /images/venue/
 */
export const VENUE_IMAGES = [
  "/images/venue/venue-1.png",
  "/images/venue/venue-2.png",
  "/images/venue/venue-3.png",
  "/images/venue/venue-4.png",
  "/images/venue/venue-5.png",
  "/images/venue/venue-6.png",
  "/images/venue/venue-7.png",
] as const;

export const VENUE_IMAGE_ALTS: Record<number, string> = {
  0: "Grand ballroom with floral stage and gold accents",
  1: "Ornate stage with golden arches and chandeliers",
  2: "Elegant hall with hanging florals and crystal chandeliers",
  3: "Reception hall with red carpet and floral centerpieces",
  4: "Luxurious ballroom with gold and maroon decor",
  5: "Grand staircase with white orchids and golden details",
  6: "Banquet hall with warm lighting and floral runners",
};

export function getVenueImageSrc(index: number): string {
  return VENUE_IMAGES[Math.min(Math.max(0, index), VENUE_IMAGES.length - 1)];
}
