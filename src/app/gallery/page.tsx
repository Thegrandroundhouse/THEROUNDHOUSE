import type { Metadata } from "next";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";

export const metadata: Metadata = {
  title: "Gallery – The Grand Roundhouse",
  description: "Photo and video gallery. Testimonials and wedding setups.",
};

export default function GalleryPage() {
  return (
    <main id="main-content" className="page-content bg-ivory">
      <div className="container py-16 md:py-24">
        <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-gold">Our Venue</p>
        <h1 className="page-title mt-2">Gallery</h1>
        <div className="divider-gold mt-4" />
        <p className="page-lead mt-4">
          Explore our spaces, past events and the scale and elegance we bring to every celebration.
        </p>
        <GalleryGrid />
      </div>
    </main>
  );
}
