import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { weddingTypes } from "@/data/weddings";
import { VENUE_IMAGES, VENUE_IMAGE_ALTS } from "@/data/venue-images";

export const metadata: Metadata = {
  title: "Weddings – The Grand Roundhouse",
  description: "Luxury wedding celebrations at The Grand Roundhouse. Asian, African, Turkish, Sikh, Hindu, Muslim & Bengali weddings.",
};

export default function WeddingsPage() {
  return (
    <main id="main-content" className="page-content bg-ivory">
      <div className="container py-16 md:py-24">
        <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-gold">Bespoke Weddings</p>
        <h1 className="page-title mt-2">Weddings</h1>
        <div className="divider-gold mt-4" />
        <p className="page-lead mt-4">
          Elegance tailored to every occasion. From Asian and African to Turkish, Sikh, Hindu, Muslim and Bengali weddings — we create unforgettable celebrations.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {weddingTypes.map((w, i) => {
            const src = VENUE_IMAGES[i % VENUE_IMAGES.length] ?? "/images/venue/venue-1.png";
            const alt = VENUE_IMAGE_ALTS[i % VENUE_IMAGES.length] ?? w.label;
            return (
            <Link key={w.slug} href={`/weddings/${w.type}`} className="group luxury-card block overflow-hidden">
              <div className="relative aspect-[4/5]">
                <Image src={src} alt={alt} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" className="object-cover transition duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                  <h2 className="font-serif text-xl font-semibold md:text-2xl">{w.label}</h2>
                  <span className="mt-2 inline-flex items-center text-sm font-medium uppercase tracking-widest text-gold-light">Discover →</span>
                </div>
              </div>
            </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
