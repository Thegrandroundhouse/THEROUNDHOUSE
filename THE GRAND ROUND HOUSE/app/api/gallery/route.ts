import { NextRequest, NextResponse } from "next/server";

interface GalleryImage {
  id: string;
  src: string;
  alt: string;
  category: string;
}

const placeholderImages: GalleryImage[] = [
  { id: "1", src: "/images/venue/venue-1.png", alt: "Grand Ballroom", category: "ballroom" },
  { id: "2", src: "/images/venue/venue-2.png", alt: "Reception", category: "reception" },
  { id: "3", src: "/images/venue/venue-3.png", alt: "Ceremony", category: "ceremony" },
  { id: "4", src: "/images/venue/venue-4.png", alt: "Stage & Florals", category: "ballroom" },
  { id: "5", src: "/images/venue/venue-5.png", alt: "Banquet Hall", category: "reception" },
  { id: "6", src: "/images/venue/venue-6.png", alt: "Grand Staircase", category: "ceremony" },
  { id: "7", src: "/images/venue/venue-7.png", alt: "Elegant Setting", category: "ballroom" },
];

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category");
  const filtered = category
    ? placeholderImages.filter((i) => i.category === category)
    : placeholderImages;
  return NextResponse.json(filtered);
}
