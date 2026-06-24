"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { label: "Home", href: "/" },
  {
    label: "Weddings",
    href: "/weddings",
    children: [
      "Weddings",
      "Asian Weddings",
      "African Weddings",
      "Turkish Weddings",
      "Sikh Weddings",
      "Muslim Weddings",
      "Hindu Weddings",
      "Bengali Weddings",
    ],
  },
  {
    label: "Events",
    href: "/events",
    children: [
      "Events",
      "Mehndi & Henna Parties",
      "Bar & Bat Mitzvah",
      "Corporate",
      "Birthdays",
    ],
  },
  {
    label: "Suites",
    href: "/suites",
    children: [
      "Main Hall",
      "The Round Room",
      "The Garden Suite",
      "VIP Suites",
    ],
  },
  { label: "In-House Catering", href: "/catering" },
  { label: "Décor", href: "/decor" },
  {
    label: "Gallery",
    href: "/gallery",
    children: [
      "Photo Gallery",
      "Video Gallery",
      "Testimonials",
      "Wedding Setups",
    ],
  },
  { label: "Testimonials", href: "/testimonials" },
  { label: "Blog", href: "/blog" },
  { label: "Team", href: "/team" },
  { label: "Contact Us", href: "/contact" },
];

const PHONE = "020 3918 8999";

type HeaderProps = {
  onMenuClick?: () => void;
};

export default function Header({ onMenuClick }: HeaderProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    supabase.auth.getSession().then(({ data: { session } }) => setIsAdmin(!!session?.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setIsAdmin(!!session?.user));
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    setProfileOpen(false);
    window.location.href = "/admin-login";
  };

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner container">
          <Link href="/" className="logo">
            The Grand Roundhouse
          </Link>
          <span className="header-phone-desk">
            <a href={`tel:${PHONE.replace(/\s/g, "")}`}>{PHONE}</a>
          </span>
          <Link href="/contact#enquire" className="btn btn-primary header-cta-desk">
            Enquire now
          </Link>
          {isAdmin && (
            <div className="header-profile-wrap">
              <button
                type="button"
                className="header-profile-btn"
                aria-label="Account menu"
                aria-expanded={profileOpen}
                onClick={() => setProfileOpen(!profileOpen)}
              >
                <span className="header-profile-icon" aria-hidden />
              </button>
              {profileOpen && (
                <>
                  <div className="header-profile-backdrop" onClick={() => setProfileOpen(false)} />
                  <div className="header-profile-dropdown">
                    <Link href="/admin" onClick={() => setProfileOpen(false)}>Dashboard</Link>
                    <button type="button" onClick={handleLogout}>Log out</button>
                  </div>
                </>
              )}
            </div>
          )}
          {onMenuClick && (
            <button
              type="button"
              className="header-menu-btn"
              aria-label="Open menu"
              onClick={onMenuClick}
            >
              Menu
            </button>
          )}
          <button
            type="button"
            className="nav-toggle"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
        <nav
          className="main-nav"
          aria-label="Main navigation"
          data-mobile-open={mobileOpen}
        >
          <div className="container nav-wrap">
            <div className="nav-mobile-cta">
              <a href={`tel:${PHONE.replace(/\s/g, "")}`} className="nav-mobile-phone">{PHONE}</a>
              <Link href="/contact#enquire" className="btn btn-primary" onClick={() => setMobileOpen(false)}>Enquire now</Link>
            </div>
            <ul className="nav-list">
              {NAV.map((item) => (
                <li
                  key={item.label}
                  className="nav-item"
                  onMouseEnter={() => item.children && setOpenMenu(item.label)}
                  onMouseLeave={() => setOpenMenu(null)}
                >
                  {item.children ? (
                    <>
                      <button
                        type="button"
                        className="nav-link"
                        aria-expanded={openMenu === item.label}
                        aria-haspopup="true"
                        onClick={() =>
                          setOpenMenu(openMenu === item.label ? null : item.label)
                        }
                      >
                        {item.label}
                        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden>
                          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                      </button>
                      <ul
                        className="dropdown"
                        role="menu"
                        hidden={openMenu !== item.label}
                        data-open={openMenu === item.label}
                      >
                        {item.children.map((child) => (
                          <li key={child} role="none">
                            <Link
                              href={`${item.href}#${child.toLowerCase().replace(/\s+/g, "-")}`}
                              className="dropdown-link"
                              role="menuitem"
                              onClick={() => setMobileOpen(false)}
                            >
                              {child}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <Link href={item.href} className="nav-link" onClick={() => setMobileOpen(false)}>
                      {item.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </header>
    </>
  );
}
