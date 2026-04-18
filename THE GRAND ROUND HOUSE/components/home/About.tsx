import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/data/site";
import { AnimateIn } from "@/components/animations/AnimateIn";

export function About() {
  return (
    <AnimateIn as="section" animation="fade-in-up" className="grid min-h-[min(80vh,700px)] grid-cols-1 md:grid-cols-2">
      {/* Left: large image */}
      <div className="relative h-[50vh] md:h-auto md:min-h-full overflow-hidden">
        <Image
          src="/images/venue/venue-7.png"
          alt="Grand ballroom with chandeliers and elegant setting"
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover transition duration-700 ease-out hover:scale-105"
          priority
        />
      </div>
      {/* Right: text on light beige */}
      <div className="flex flex-col justify-center bg-[#f7f4ed] px-8 py-16 md:px-12 md:py-20 lg:px-16">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-[#a4845a]">
          About Us
        </p>
        <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-charcoal md:text-4xl lg:text-5xl">
          Welcome to {siteConfig.venueName}
        </h2>
        <p className="mt-6 max-w-lg text-base leading-relaxed text-charcoal/90">
          We are a luxury Wedding and Reception Venue in North London. We are unique because we know that each event
          will only happen once in a lifetime — and so we do everything possible to ensure perfection for your special day.
        </p>
        <p className="mt-4 max-w-lg text-base leading-relaxed text-charcoal/80">
          We truly care about our clients and always go the extra mile for each and every bride, groom, family and
          client who comes through our doors.
        </p>
        <Link
          href="/contact"
          className="mt-10 inline-flex w-fit items-center gap-2 rounded-md bg-[#a4845a] px-8 py-3.5 text-sm font-medium uppercase tracking-[0.2em] text-white transition hover:bg-[#8b6f4a]"
        >
          About Us
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </Link>
      </div>
    </AnimateIn>
  );
}
