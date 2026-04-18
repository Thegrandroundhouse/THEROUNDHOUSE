import Link from "next/link";
import { siteConfig } from "@/data/site";

export function ComingSoonBanner() {
  const { comingSoon } = siteConfig;
  if (!comingSoon) return null;

  return (
    <div className="relative z-[99] border-b border-gold/20 bg-charcoal text-ivory">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-4 py-3 text-center md:px-6">
        <span className="inline-flex items-center gap-2 text-sm font-medium tracking-wide">
          <span className="h-2 w-2 animate-pulse rounded-full bg-gold-light" aria-hidden />
          Coming Soon
        </span>
        <span className="hidden text-ivory/50 md:inline" aria-hidden>
          •
        </span>
        <span className="font-serif text-sm font-semibold text-gold-light">
          Opening {comingSoon.month} {comingSoon.year}
        </span>
        <span className="hidden text-ivory/50 md:inline" aria-hidden>
          •
        </span>
        <Link
          href="/contact"
          className="text-sm font-medium text-gold-light underline decoration-gold-light/50 underline-offset-2 transition hover:text-gold"
        >
          Register your interest
        </Link>
      </div>
    </div>
  );
}
