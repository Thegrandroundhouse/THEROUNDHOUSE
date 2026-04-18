import Link from "next/link";
import { siteConfig } from "@/data/site";

export function Hero() {
  return (
    <section className="relative min-h-[100vh] flex flex-col justify-center overflow-hidden bg-ink text-ivory">
      {/* Background video */}
      <div className="absolute inset-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="h-full w-full object-cover scale-105"
          poster="https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1920&q=90"
        >
          <source src="/video/hero.mp4" type="video/mp4" />
        </video>
      </div>
      <div className="absolute inset-0 bg-hero-overlay" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-ink/50" />
      {/* Subtle gold vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_120%,rgba(212,175,55,0.06),transparent)]" />

      {/* Thin luxury frame */}
      <div className="absolute inset-4 md:inset-8 border border-ivory/10 pointer-events-none z-10 rounded-sm" />
      <div className="absolute inset-5 md:inset-9 border border-ivory/5 pointer-events-none z-10 rounded-sm" />

      <div className="relative z-10 mx-auto w-full max-w-5xl px-8 py-28 text-center md:px-12 lg:py-32">
        <p className="animate-fade-in text-xs font-medium uppercase tracking-[0.4em] text-gold-light/95 opacity-0 [animation-delay:300ms] [animation-fill-mode:forwards]">
          {siteConfig.venueName}
        </p>
        <h1 className="animate-fade-in-up mt-6 font-serif text-4xl font-medium leading-[1.1] tracking-tight opacity-0 [animation-delay:500ms] [animation-fill-mode:forwards] md:text-6xl lg:text-7xl xl:text-8xl">
          A Luxury Wedding Venue Like No Other
        </h1>
        <div className="divider-gold-thick mt-8 opacity-0 animate-fade-in [animation-delay:700ms] [animation-fill-mode:forwards]" />
        <div className="divider-gold mt-2 opacity-0 animate-fade-in [animation-delay:750ms] [animation-fill-mode:forwards]" />
        <p className="animate-fade-in-up mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-ivory/90 opacity-0 [animation-delay:850ms] [animation-fill-mode:forwards] md:text-xl">
          Where every celebration is crafted with care, elegance and timeless attention to detail.
        </p>
        <div className="mt-14 flex flex-wrap items-center justify-center gap-5 opacity-0 animate-fade-in [animation-delay:1000ms] [animation-fill-mode:forwards]">
          <Link href="/contact" className="btn-primary">
            Enquire Now
          </Link>
          <Link href="/gallery" className="btn-outline btn-outline-light">
            View Gallery
          </Link>
        </div>

        <ul className="mt-24 flex flex-wrap items-center justify-center gap-10 border-t border-ivory/15 pt-14 text-xs uppercase tracking-[0.3em] text-ivory/75 md:gap-16">
          <li className="flex flex-col items-center gap-1">
            <span className="font-serif text-3xl font-semibold bg-gradient-to-b from-gold-light to-gold bg-clip-text text-transparent md:text-4xl">
              1,500+
            </span>
            <span>Reviews</span>
          </li>
          <li className="hidden h-12 w-px bg-gradient-to-b from-transparent via-ivory/25 to-transparent md:block" />
          <li className="flex flex-col items-center gap-1">
            <span className="font-serif text-3xl font-semibold bg-gradient-to-b from-gold-light to-gold bg-clip-text text-transparent md:text-4xl">
              3
            </span>
            <span>Luxury Ballrooms</span>
          </li>
          <li className="hidden h-12 w-px bg-gradient-to-b from-transparent via-ivory/25 to-transparent md:block" />
          <li className="flex flex-col items-center gap-1">
            <span className="font-serif text-3xl font-semibold bg-gradient-to-b from-gold-light to-gold bg-clip-text text-transparent md:text-4xl">
              800+
            </span>
            <span>Capacity</span>
          </li>
        </ul>
      </div>
    </section>
  );
}
