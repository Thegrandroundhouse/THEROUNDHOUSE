import { NextRequest, NextResponse } from "next/server";
import { VENUE_IMAGES, VENUE_IMAGE_ALTS } from "@/data/venue-images";
import type { GalleryImage } from "@/types/site";

const placeholderImages: GalleryImage[] = VENUE_IMAGES.map((src, i) => ({
  id: String(i + 1),
  src,
  alt: VENUE_IMAGE_ALTS[i as keyof typeof VENUE_IMAGE_ALTS] ?? `Venue ${i + 1}`,
  category: "venue",
}));

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category");
  const filtered = category ? placeholderImages.filter((i) => i.category === category) : placeholderImages;
  return NextResponse.json(filtered);
}
