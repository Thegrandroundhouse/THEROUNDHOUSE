import Link from "next/link";
import { siteConfig } from "@/data/site";

export function ComingSoonSection() {
  const { comingSoon } = siteConfig;
  if (!comingSoon) return null;

  return (
    <section className="relative overflow-hidden border-y border-gold/15 bg-gradient-to-b from-charcoal to-ink py-16 text-ivory md:py-20">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_50%,rgba(212,175,55,0.08),transparent)]" />
      <div className="relative mx-auto max-w-3xl px-6 text-center md:px-8">
        <p className="text-xs font-medium uppercase tracking-[0.35em] text-gold-light/90">
          We&apos;re putting the finishing touches
        </p>
        <h2 className="mt-4 font-serif text-3xl font-semibold tracking-tight md:text-4xl lg:text-5xl">
          Coming Soon
        </h2>
        <p className="mt-4 text-xl font-serif font-medium text-gold-light md:text-2xl">
          Opening {comingSoon.month} {comingSoon.year}
        </p>
        <p className="mt-6 max-w-xl mx-auto text-ivory/80 leading-relaxed">
          {siteConfig.venueName} will be opening its doors soon. Register your interest and we&apos;ll be in touch with updates and launch details.
        </p>
        <Link
          href="/contact"
          className="mt-8 inline-flex items-center gap-2 rounded-md bg-gold px-8 py-3.5 text-sm font-medium uppercase tracking-[0.2em] text-charcoal transition hover:bg-gold-light"
        >
          Register your interest
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </Link>
      </div>
    </section>
  );
}
