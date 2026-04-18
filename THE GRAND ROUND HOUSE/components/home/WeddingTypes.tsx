import Link from "next/link";
import Image from "next/image";
import { weddingTypes } from "@/data/weddings";
import { AnimateIn } from "@/components/animations/AnimateIn";

const panelImages = [
  "/images/venue/venue-1.png",
  "/images/venue/venue-2.png",
  "/images/venue/venue-3.png",
  "/images/venue/venue-4.png",
  "/images/venue/venue-5.png",
  "/images/venue/venue-6.png",
  "/images/venue/venue-7.png",
];

function DiscoverIcon() {
  return (
    <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full border border-gold-light/80 text-gold-light" aria-hidden>
      <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
      </svg>
    </span>
  );
}

export function WeddingTypes() {
  return (
    <AnimateIn as="section" animation="scale-in" className="bg-[#faf8f5] py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-[#a4845a]">
          Bespoke Weddings
        </p>
        <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-charcoal md:text-4xl lg:text-5xl">
          Elegance Tailored to Every Occasion
        </h2>
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {weddingTypes.map((w, i) => (
            <Link
              key={w.slug}
              href={`/weddings/${w.type}`}
              className="group relative flex min-h-[380px] overflow-hidden rounded-sm md:min-h-[420px]"
            >
              <Image
                src={panelImages[i % panelImages.length]}
                alt={w.label}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                className="object-cover transition duration-700 ease-out group-hover:scale-105"
              />
              {/* Dark gradient overlay at bottom for text */}
              <div
                className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent"
                aria-hidden
              />
              <div className="absolute inset-x-0 bottom-0 flex flex-col justify-end p-6 text-white">
                <span className="text-lg font-semibold tracking-tight md:text-xl">
                  {w.label.toUpperCase()}
                </span>
                <span className="mt-2 inline-flex items-center text-sm font-medium tracking-widest text-white/95">
                  Discover
                  <DiscoverIcon />
                </span>
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-8 h-px w-full bg-gradient-to-r from-transparent via-gold/50 to-transparent" aria-hidden />
      </div>
    </AnimateIn>
  );
}
