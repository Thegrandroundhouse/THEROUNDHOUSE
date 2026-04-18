"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { siteConfig } from "@/data/site";
import { createClient } from "@/lib/supabase/client";

const nav = [
  { label: "Weddings", href: "/weddings", children: [
    { label: "Asian Weddings", href: "/weddings/asian" },
    { label: "African Weddings", href: "/weddings/african" },
    { label: "Turkish Weddings", href: "/weddings/turkish" },
    { label: "Sikh Weddings", href: "/weddings/sikh" },
    { label: "Muslim Weddings", href: "/weddings/muslim" },
    { label: "Hindu Weddings", href: "/weddings/hindu" },
    { label: "Bengali Weddings", href: "/weddings/bengali" },
  ]},
  { label: "Events", href: "/events", children: [
    { label: "Mehndi & Henna", href: "/events/mehndi-henna" },
    { label: "Corporate", href: "/events/corporate" },
    { label: "Birthdays", href: "/events/birthdays" },
  ]},
  { label: "Suites", href: "/suites", children: [
    { label: "Grand Ballroom", href: "/suites/grand-ballroom" },
    { label: "Meridian Ballroom", href: "/suites/meridian-ballroom" },
    { label: "Eternity Suite", href: "/suites/eternity-suite" },
    { label: "Infinity Suite", href: "/suites/infinity-suite" },
  ]},
  { label: "Catering", href: "/catering" },
  { label: "Décor", href: "/decor" },
  { label: "Gallery", href: "/gallery" },
  { label: "Testimonials", href: "/testimonials" },
  { label: "Contact", href: "/contact" },
];

const telHref = `tel:${siteConfig.phone.replace(/\s/g, "")}`;

export function GrandHeader() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    supabase.auth.getSession().then(({ data: { session } }) => setIsAdmin(!!session?.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setIsAdmin(!!session?.user));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const handleLogout = async () => {
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    setProfileOpen(false);
    setMobileOpen(false);
    window.location.href = "/admin-login";
  };

  return (
    <header className="sticky top-0 z-[100] border-b border-charcoal/[0.06] bg-ivory/95 shadow-[0_1px_0_rgba(0,0,0,0.04)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-3 sm:gap-3 sm:px-6 md:px-10 md:py-4">
        <Link
          href="/"
          className="min-w-0 flex-1 truncate pr-2 font-serif text-[1.05rem] font-semibold tracking-[0.02em] text-charcoal transition hover:text-gold md:flex-none md:pr-0 md:text-2xl"
        >
          {siteConfig.venueName}
        </Link>

        <a
          href={telHref}
          className="hidden shrink-0 text-sm tracking-wide text-charcoal/70 transition hover:text-gold md:block"
        >
          {siteConfig.phone}
        </a>

        <div className="hidden shrink-0 items-center gap-3 md:flex">
          <Link href="/contact" className="btn-primary inline-flex text-[0.7rem] py-3 px-6">
            Enquire Now
          </Link>
          {isAdmin && (
            <div className="relative">
              <button
                type="button"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold text-ivory shadow-sm transition hover:bg-gold-dark"
                aria-label="Account"
                aria-expanded={profileOpen}
                onClick={() => setProfileOpen(!profileOpen)}
              >
                <span className="sr-only">Account</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </button>
              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} aria-hidden />
                  <div className="absolute right-0 top-full z-50 mt-1.5 min-w-[168px] rounded-lg border border-charcoal/10 bg-ivory py-1 shadow-lg">
                    <Link
                      href="/admin"
                      className="block px-4 py-2.5 text-sm text-charcoal hover:bg-gold-pale/40"
                      onClick={() => setProfileOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <button
                      type="button"
                      className="block w-full px-4 py-2.5 text-left text-sm text-charcoal hover:bg-gold-pale/40"
                      onClick={handleLogout}
                    >
                      Log out
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 md:hidden">
          <button
            type="button"
            className="grand-header-m-menu flex h-10 w-10 items-center justify-center rounded-xl border border-charcoal/[0.1] bg-white text-charcoal shadow-sm transition hover:border-gold/30 hover:bg-champagne/30 active:scale-[0.97]"
            onClick={() => setMobileOpen((o) => !o)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            <svg className="h-[22px] w-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      <nav className="hidden border-t border-charcoal/[0.05] md:block" aria-label="Main">
        <ul className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-0 px-6 py-2.5 md:px-10">
          {nav.map((item) => (
            <li key={item.href} className="relative" onMouseEnter={() => item.children && setOpenMenu(item.href)} onMouseLeave={() => setOpenMenu(null)}>
              {item.children ? (
                <>
                  <span className="block cursor-pointer px-4 py-3 text-[11px] font-medium uppercase tracking-[0.28em] text-charcoal/80 transition hover:text-gold">{item.label}</span>
                  {openMenu === item.href && (
                    <ul className="absolute left-1/2 top-full z-[110] mt-0.5 min-w-[240px] -translate-x-1/2 rounded-sm border border-charcoal/[0.08] bg-ivory shadow-[0_8px_32px_-8px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.04)] backdrop-blur-xl">
                      <li className="border-b border-charcoal/[0.06]">
                        <Link href={item.href} className="block px-5 py-3 text-sm text-charcoal/75 transition hover:bg-gold-pale/30 hover:text-gold">Overview</Link>
                      </li>
                      {item.children.map((c) => (
                        <li key={c.href}>
                          <Link href={c.href} className="block px-5 py-3 text-sm text-charcoal/75 transition hover:bg-gold-pale/30 hover:text-gold">{c.label}</Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <Link href={item.href} className="block px-4 py-3 text-[11px] font-medium uppercase tracking-[0.28em] text-charcoal/80 transition hover:text-gold">{item.label}</Link>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Portal: header has backdrop-filter — fixed children would be trapped in that layer; render menu on document.body */}
      {portalReady &&
        mobileOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <button
              type="button"
              className="fixed inset-0 z-[96] bg-charcoal/35 md:hidden"
              style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
            />
            <div
              className="grand-mobile-nav-sheet fixed left-0 right-0 z-[97] flex max-h-none flex-col overflow-y-auto overflow-x-hidden border-t border-charcoal/[0.1] bg-ivory shadow-[0_16px_48px_-12px_rgba(0,0,0,0.18)] md:hidden"
              style={{
                top: "max(3.75rem, calc(env(safe-area-inset-top, 0px) + 2.85rem))",
                bottom: "calc(4.85rem + env(safe-area-inset-bottom, 0px))",
                WebkitOverflowScrolling: "touch",
                overscrollBehavior: "contain",
              }}
              role="dialog"
              aria-modal="true"
              aria-label="Site menu"
            >
              <div className="px-4 py-4 pb-10">
                {isAdmin && (
                  <div className="mb-4 rounded-xl border border-gold/25 bg-gold/8 p-3">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-dark">Staff</p>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href="/admin"
                        className="min-w-[120px] flex-1 rounded-lg bg-gold py-2.5 text-center text-sm font-semibold text-ivory"
                        onClick={() => setMobileOpen(false)}
                      >
                        Dashboard
                      </Link>
                      <button
                        type="button"
                        className="min-w-[120px] flex-1 rounded-lg border border-charcoal/15 bg-white py-2.5 text-sm font-medium text-charcoal"
                        onClick={() => void handleLogout()}
                      >
                        Log out
                      </button>
                    </div>
                  </div>
                )}
                <nav aria-label="Mobile">
                  <ul className="space-y-0.5">
                    {nav.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className="block py-3 font-medium tracking-wide text-charcoal active:bg-champagne/40"
                          onClick={() => setMobileOpen(false)}
                        >
                          {item.label}
                        </Link>
                        {item.children && (
                          <ul className="ml-2 space-y-0 border-l-2 border-gold/20 pl-3">
                            {item.children.map((c) => (
                              <li key={c.href}>
                                <Link
                                  href={c.href}
                                  className="block py-2.5 text-sm text-charcoal/75 active:bg-champagne/30"
                                  onClick={() => setMobileOpen(false)}
                                >
                                  {c.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
            </div>
          </>,
          document.body,
        )}
    </header>
  );
}
