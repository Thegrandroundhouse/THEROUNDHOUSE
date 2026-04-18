import Image from "next/image";
import Link from "next/link";
import { AnimateIn } from "@/components/animations/AnimateIn";
import type { ImagesMap } from "@/lib/site-data-server";
import { VENUE_IMAGES, VENUE_IMAGE_ALTS } from "@/data/venue-images";

const GALLERY_KEYS = ["gallery_1", "gallery_2", "gallery_3", "gallery_4", "gallery_5", "gallery_6", "gallery_7"];

type Props = { images?: ImagesMap };

export function VenueGallery({ images = {} }: Props) {
  const venueImages = GALLERY_KEYS.map((key, i) => ({
    src: images[key]?.url ?? VENUE_IMAGES[i] ?? "/images/venue/venue-1.png",
    alt: images[key]?.alt_text ?? (VENUE_IMAGE_ALTS[i as keyof typeof VENUE_IMAGE_ALTS] ?? `Venue ${i + 1}`),
  }));

  return (
    <AnimateIn as="section" animation="fade-in-up-slow" className="relative overflow-hidden bg-ink py-24 md:py-32">
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 h-32 bg-gradient-to-b from-ink to-transparent" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-6 md:px-10">
        <p className="text-center text-[10px] font-medium uppercase tracking-[0.35em] text-gold-light">Our Venue</p>
        <h2 className="mt-4 text-center font-serif text-3xl font-semibold tracking-tight text-ivory md:text-4xl lg:text-5xl xl:text-6xl">
          Grand Spaces, Unforgettable Moments
        </h2>
        <div className="divider-gold mx-auto mt-6" />
        <p className="mx-auto mt-4 max-w-2xl text-center text-lg leading-relaxed text-ivory/85 md:text-xl">
          A glimpse of the scale and elegance we bring to every celebration.
        </p>
        <div className="mt-16">
          <div className="group relative overflow-hidden rounded-sm">
            <div className="relative aspect-[21/9] md:aspect-[3/1]">
              <Image src={venueImages[0].src} alt={venueImages[0].alt} fill sizes="100vw" className="object-cover transition duration-700 ease-out group-hover:scale-[1.02]" priority unoptimized={venueImages[0].src.startsWith("http")} />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/30 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-gold/25 to-transparent opacity-90" />
            </div>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-3 lg:gap-6">
          {venueImages.slice(1).map((img, i) => (
            <div key={i} className="group relative overflow-hidden rounded-sm">
              <div className="relative aspect-[4/3]">
                <Image src={img.src} alt={img.alt} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover transition duration-700 ease-out group-hover:scale-105" unoptimized={img.src.startsWith("http")} />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/50 to-transparent opacity-90" />
                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-gold/20 to-transparent opacity-80" />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-14 text-center">
          <Link href="/gallery" className="btn-outline border-ivory/60 text-ivory hover:bg-ivory/10 hover:border-gold-light">View Full Gallery</Link>
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-32 bg-gradient-to-t from-ink to-transparent" aria-hidden />
    </AnimateIn>
  );
}
