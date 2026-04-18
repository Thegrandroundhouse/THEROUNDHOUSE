"use client";

import Image from "next/image";
import useSWR from "swr";
import { fetcher } from "@/lib/api";
import type { GalleryImage } from "@/types/site";

const PLACEHOLDER = "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80";

export function GalleryGrid() {
  const { data: images, isLoading } = useSWR<GalleryImage[]>("/api/gallery", fetcher);

  if (isLoading) {
    return (
      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="aspect-[4/3] animate-pulse rounded-sm bg-champagne/40" />
        ))}
      </div>
    );
  }

  const list = Array.isArray(images) && images.length > 0 ? images : [
    { id: "1", src: PLACEHOLDER, alt: "Grand ballroom", category: "venue" },
    { id: "2", src: PLACEHOLDER, alt: "Elegant hall", category: "venue" },
    { id: "3", src: PLACEHOLDER, alt: "Reception", category: "venue" },
    { id: "4", src: PLACEHOLDER, alt: "Stage and décor", category: "venue" },
    { id: "5", src: PLACEHOLDER, alt: "Banquet", category: "venue" },
    { id: "6", src: PLACEHOLDER, alt: "Luxury ballroom", category: "venue" },
  ];

  return (
    <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:gap-6">
      {list.map((img) => (
        <div key={img.id} className="group relative overflow-hidden rounded-sm">
          <div className="relative aspect-[4/3]">
            <Image
              src={img.src}
              alt={img.alt}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition duration-500 group-hover:scale-105"
              unoptimized={img.src.startsWith("http")}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent opacity-0 transition opacity duration-300 group-hover:opacity-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
