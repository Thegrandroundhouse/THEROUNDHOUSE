"use client";

import Image from "next/image";
import useSWR from "swr";
import { SWR_KEYS } from "@/lib/swr-config";
import type { GalleryImage } from "@/types";
import { VENUE_IMAGES, VENUE_IMAGE_ALTS } from "@/data/venue-images";

export default function GalleryPage() {
  const { data: images = [], isLoading } = useSWR<GalleryImage[]>(SWR_KEYS.gallery(""));

  const displayImages =
    images.length > 0
      ? images
      : VENUE_IMAGES.map((src, i) => ({
          id: String(i + 1),
          src,
          alt: VENUE_IMAGE_ALTS[i as keyof typeof VENUE_IMAGE_ALTS] ?? `Venue ${i + 1}`,
          category: "venue",
        }));

  return (
    <div className="mx-auto max-w-7xl px-6 py-20 md:px-8 md:py-28">
      <p className="text-xs font-medium uppercase tracking-[0.3em] text-gold">Moments</p>
      <h1 className="section-heading mt-2">Gallery</h1>
      <div className="divider-gold mt-6" />
      <p className="section-sub max-w-2xl">
        A glimpse of our ballrooms, setups and celebrations.
      </p>
      {isLoading ? (
        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="aspect-[4/3] animate-pulse rounded-sm bg-champagne/40" />
          ))}
        </div>
      ) : (
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {displayImages.map((img) => (
            <div
              key={img.id}
              className="relative overflow-hidden rounded-sm border border-charcoal/10 shadow-sm transition hover:shadow-elegant"
            >
              <div className="relative aspect-[4/3] bg-champagne/30">
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover"
                />
              </div>
              <p className="p-4 font-medium text-charcoal/80">{img.alt}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
