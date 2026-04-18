"use client";

import Link from "next/link";
import { useState } from "react";
import { siteConfig } from "@/data/site";

const nav = [
  {
    label: "Weddings",
    href: "/weddings",
    children: [
      { label: "Asian Weddings", href: "/weddings/asian" },
      { label: "African Weddings", href: "/weddings/african" },
      { label: "Turkish Weddings", href: "/weddings/turkish" },
      { label: "Sikh Weddings", href: "/weddings/sikh" },
      { label: "Muslim Weddings", href: "/weddings/muslim" },
      { label: "Hindu Weddings", href: "/weddings/hindu" },
      { label: "Bengali Weddings", href: "/weddings/bengali" },
    ],
  },
  {
    label: "Events",
    href: "/events",
    children: [
      { label: "Mehndi & Henna", href: "/events/mehndi" },
      { label: "Bar & Bat Mitzvah", href: "/events/bar-bat-mitzvah" },
      { label: "Corporate", href: "/events/corporate" },
      { label: "Birthdays", href: "/events/birthdays" },
    ],
  },
  {
    label: "Suites",
    href: "/suites",
    children: [
      { label: "Grand Ballroom", href: "/suites/grand-ballroom" },
      { label: "Meridian Ballroom", href: "/suites/meridian-ballroom" },
      { label: "Eternity Suite", href: "/suites/eternity-suite" },
      { label: "Infinity Suite", href: "/suites/infinity-suite" },
    ],
  },
  { label: "Catering", href: "/catering" },
  { label: "Décor", href: "/decor" },
  { label: "Gallery", href: "/gallery" },
  { label: "Testimonials", href: "/testimonials" },
  { label: "Contact", href: "/contact" },
];

export function Header() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-[100] border-b border-charcoal/[0.06] bg-ivory/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
        <Link
          href="/"
          className="font-serif text-xl font-semibold tracking-[0.02em] text-charcoal transition hover:text-gold md:text-2xl"
        >
          {siteConfig.venueName}
        </Link>
        <a
          href={`tel:${siteConfig.phone.replace(/\s/g, "")}`}
          className="hidden text-sm tracking-wide text-charcoal/70 transition hover:text-gold md:block"
        >
          {siteConfig.phone}
        </a>
        <Link href="/contact" className="btn-primary hidden md:inline-flex text-[0.7rem] py-3 px-6">
          Enquire Now
        </Link>
        <button
          type="button"
          className="rounded p-2 text-charcoal transition hover:bg-champagne/40 md:hidden"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Menu"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>
      <nav className="hidden border-t border-charcoal/[0.05] md:block">
        <ul className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-0 px-6 py-2.5 md:px-10">
          {nav.map((item) => (
            <li
              key={item.href}
              className="relative"
              onMouseEnter={() => item.children && setOpenMenu(item.href)}
              onMouseLeave={() => setOpenMenu(null)}
            >
              {item.children ? (
                <>
                  <span className="block cursor-pointer px-4 py-3 text-[11px] font-medium uppercase tracking-[0.28em] text-charcoal/80 transition hover:text-gold">
                    {item.label}
                  </span>
                  {openMenu === item.href && (
                    <ul className="absolute left-1/2 top-full z-[110] mt-0.5 min-w-[240px] -translate-x-1/2 rounded-sm border border-charcoal/[0.08] bg-ivory shadow-[0_8px_32px_-8px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.04)] backdrop-blur-xl">
                      <li className="border-b border-charcoal/[0.06]">
                        <Link
                          href={item.href}
                          className="block px-5 py-3 text-sm text-charcoal/75 transition hover:bg-gold-pale/30 hover:text-gold"
                        >
                          Overview
                        </Link>
                      </li>
                      {item.children.map((c) => (
                        <li key={c.href}>
                          <Link
                            href={c.href}
                            className="block px-5 py-3 text-sm text-charcoal/75 transition hover:bg-gold-pale/30 hover:text-gold"
                          >
                            {c.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <Link
                  href={item.href}
                  className="block px-4 py-3 text-[11px] font-medium uppercase tracking-[0.28em] text-charcoal/80 transition hover:text-gold"
                >
                  {item.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>
      {mobileOpen && (
        <div className="border-t border-charcoal/[0.08] bg-ivory px-6 py-6 md:hidden">
          <ul className="space-y-1">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block py-3 font-medium tracking-wide text-charcoal"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
                {item.children?.map((c) => (
                  <li key={c.href} className="pl-4">
                    <Link
                      href={c.href}
                      className="block py-2 text-sm text-charcoal/70"
                      onClick={() => setMobileOpen(false)}
                    >
                      {c.label}
                    </Link>
                  </li>
                ))}
              </li>
            ))}
            <li className="mt-4 border-t border-charcoal/10 pt-4">
              <a href={`tel:${siteConfig.phone.replace(/\s/g, "")}`} className="block py-2 text-gold">
                {siteConfig.phone}
              </a>
            </li>
            <li>
              <Link
                href="/contact"
                className="btn-primary mt-3 block text-center"
                onClick={() => setMobileOpen(false)}
              >
                Enquire Now
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
