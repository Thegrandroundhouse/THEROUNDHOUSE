"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SIDEBAR_NAV = [
  { label: "Home", href: "/", hasArrow: false },
  { label: "Weddings", href: "/weddings", hasArrow: true },
  { label: "Events", href: "/events", hasArrow: true },
  { label: "Suites", href: "/suites", hasArrow: true },
  { label: "In-House Catering", href: "/catering", hasArrow: false },
  { label: "Décor", href: "/decor", hasArrow: false },
  { label: "Gallery", href: "/gallery", hasArrow: true },
  { label: "Testimonials", href: "/testimonials", hasArrow: false },
  { label: "Blog", href: "/blog", hasArrow: false },
  { label: "Team MG", href: "/team", hasArrow: false },
  { label: "Contact Us", href: "/contact", hasArrow: false },
];

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      <div
        className="sidebar-overlay"
        aria-hidden={!isOpen}
        data-open={isOpen}
        onClick={onClose}
      />
      <aside
        className="sidebar"
        aria-label="Main menu"
        data-open={isOpen}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          className="sidebar-close"
          onClick={onClose}
          aria-label="Close menu"
        >
          ×
        </button>
        <nav className="sidebar-nav">
          <ul className="sidebar-list">
            {SIDEBAR_NAV.map(({ label, href, hasArrow }) => {
              const isHome = href === "/";
              const isActive = pathname === href || (pathname === "/" && isHome);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`sidebar-link ${isActive ? "sidebar-link-active" : ""}`}
                    onClick={onClose}
                  >
                    <span>{label}</span>
                    {hasArrow && (
                      <span className="sidebar-arrow" aria-hidden>
                        →
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
}
