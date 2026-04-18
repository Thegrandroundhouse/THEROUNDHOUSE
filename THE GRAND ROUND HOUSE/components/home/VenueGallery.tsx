import Image from "next/image";
import Link from "next/link";
import { AnimateIn } from "@/components/animations/AnimateIn";

const venueImages = [
  { src: "/images/venue/venue-1.png", alt: "Grand ballroom with floral stage and gold accents" },
  { src: "/images/venue/venue-2.png", alt: "Ornate stage with golden arches and chandeliers" },
  { src: "/images/venue/venue-3.png", alt: "Elegant hall with hanging florals and crystal chandeliers" },
  { src: "/images/venue/venue-4.png", alt: "Reception hall with red carpet and floral centerpieces" },
  { src: "/images/venue/venue-5.png", alt: "Luxurious ballroom with gold and maroon decor" },
  { src: "/images/venue/venue-6.png", alt: "Grand staircase with white orchids and golden details" },
  { src: "/images/venue/venue-7.png", alt: "Banquet hall with warm lighting and floral runners" },
];

export function VenueGallery() {
  return (
    <AnimateIn as="section" animation="fade-in-up-slow" className="relative overflow-hidden bg-ink py-24 md:py-32">
      {/* Top gradient fade into section */}
      <div
        className="pointer-events-none absolute left-0 right-0 top-0 z-10 h-32 bg-gradient-to-b from-ink to-transparent"
        aria-hidden
      />
      <div className="relative mx-auto max-w-7xl px-6 md:px-10">
        <p className="text-center text-[10px] font-medium uppercase tracking-[0.35em] text-gold-light/90">
          Our Venue
        </p>
        <h2 className="section-heading mt-3 text-center text-ivory">
          Grand Spaces, Unforgettable Moments
        </h2>
        <div className="divider-gold mx-auto mt-6 [--tw-gradient-stops:transparent,rgba(212,175,55,0.8),transparent]" />
        <p className="section-sub mx-auto mt-4 max-w-2xl text-center text-ivory/70">
          A glimpse of the scale and elegance we bring to every celebration.
        </p>

        {/* Hero image: full width, big */}
        <div className="mt-16">
          <div className="group relative overflow-hidden rounded-sm">
            <div className="relative aspect-[21/9] md:aspect-[3/1]">
              <Image
                src={venueImages[0].src}
                alt={venueImages[0].alt}
                fill
                sizes="100vw"
                className="object-cover transition duration-700 ease-out group-hover:scale-[1.02]"
                priority
              />
              <div
                className="absolute inset-0"
                style={{
                  background: `
                    linear-gradient(to bottom, transparent 0%, transparent 35%, rgba(5,5,5,0.3) 65%, rgba(5,5,5,0.9) 100%),
                    linear-gradient(to right, rgba(5,5,5,0.2) 0%, transparent 18%, transparent 82%, rgba(5,5,5,0.2) 100%),
                    linear-gradient(to bottom, rgba(5,5,5,0.15) 0%, transparent 15%, transparent 85%, rgba(5,5,5,0.15) 100%)
                  `,
                }}
              />
              <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-gold/25 to-transparent opacity-90" />
            </div>
          </div>
        </div>

        {/* Grid of remaining 6: gradient + faded edges */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-3 lg:gap-6">
          {venueImages.slice(1).map((img) => (
            <div key={img.src} className="group relative overflow-hidden rounded-sm">
              <div className="relative aspect-[4/3]">
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition duration-700 ease-out group-hover:scale-105"
                />
                <div
                  className="absolute inset-0 opacity-90"
                  style={{
                    background: `
                      linear-gradient(to bottom, transparent 0%, transparent 45%, rgba(5,5,5,0.5) 80%, rgba(5,5,5,0.9) 100%),
                      linear-gradient(to right, rgba(5,5,5,0.18) 0%, transparent 12%, transparent 88%, rgba(5,5,5,0.18) 100%),
                      linear-gradient(to bottom, rgba(5,5,5,0.1) 0%, transparent 10%, transparent 90%, rgba(5,5,5,0.1) 100%)
                    `,
                  }}
                />
                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-gold/20 to-transparent opacity-80" />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-14 text-center">
          <Link
            href="/gallery"
            className="btn-outline border-ivory/60 text-ivory hover:bg-ivory/10 hover:border-gold-light"
          >
            View Full Gallery
          </Link>
        </div>
      </div>
      {/* Bottom gradient fade out */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-32 bg-gradient-to-t from-ink to-transparent"
        aria-hidden
      />
    </AnimateIn>
  );
}
