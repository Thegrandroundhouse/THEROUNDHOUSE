import Link from "next/link";
import { siteConfig } from "@/data/site";

export function GrandFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-gold/10 bg-ink text-ivory">
      <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
      <div className="absolute inset-0 bg-luxury-mesh opacity-50" />
      <div className="relative mx-auto max-w-7xl px-6 py-20 md:px-10">
        <div className="grid gap-16 md:grid-cols-3">
          <div>
            <h3 className="font-serif text-2xl font-semibold tracking-tight text-ivory md:text-3xl">{siteConfig.venueName}</h3>
            <p className="mt-4 text-sm leading-relaxed text-ivory/60">{siteConfig.tagline}</p>
            <p className="mt-5 text-sm text-ivory/70">{siteConfig.address}</p>
            <a href={`tel:${siteConfig.phone.replace(/\s/g, "")}`} className="mt-2 block text-sm text-gold-light transition hover:text-gold-light/90">{siteConfig.phone}</a>
            <a href={`mailto:${siteConfig.email}`} className="block text-sm text-gold-light transition hover:text-gold-light/90">{siteConfig.email}</a>
          </div>
          <div>
            <h4 className="text-[10px] font-semibold uppercase tracking-[0.3em] text-ivory/50">Explore</h4>
            <ul className="mt-5 space-y-3 text-sm">
              <li><Link href="/weddings" className="text-ivory/80 transition hover:text-gold-light">Weddings</Link></li>
              <li><Link href="/events" className="text-ivory/80 transition hover:text-gold-light">Events</Link></li>
              <li><Link href="/gallery" className="text-ivory/80 transition hover:text-gold-light">Gallery</Link></li>
              <li><Link href="/suites" className="text-ivory/80 transition hover:text-gold-light">Suites</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[10px] font-semibold uppercase tracking-[0.3em] text-ivory/50">Links</h4>
            <ul className="mt-5 space-y-3 text-sm">
              <li><Link href="/catering" className="text-ivory/80 transition hover:text-gold-light">In-House Catering</Link></li>
              <li><Link href="/decor" className="text-ivory/80 transition hover:text-gold-light">Décor</Link></li>
              <li><Link href="/testimonials" className="text-ivory/80 transition hover:text-gold-light">Testimonials</Link></li>
              <li><Link href="/contact" className="text-ivory/80 transition hover:text-gold-light">Contact</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-16 h-px w-full bg-gradient-to-r from-transparent via-ivory/10 to-transparent" />
        <p className="mt-8 text-center text-xs tracking-[0.15em] text-ivory/40">© {new Date().getFullYear()} {siteConfig.venueName}. All rights reserved.</p>
      </div>
    </footer>
  );
}
