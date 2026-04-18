"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { siteConfig } from "@/data/site";

function IconHome({ className }: { className?: string }) {
  return (
    <svg className={className} width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function IconEnquire({ className }: { className?: string }) {
  return (
    <svg className={className} width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.65} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function IconPhone({ className }: { className?: string }) {
  return (
    <svg className={className} width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}

export function MobilePublicBottomNav() {
  const pathname = usePathname() ?? "";
  const tel = siteConfig.phone.replace(/\s/g, "");
  const homeActive = pathname === "/";
  const enquireActive = pathname.startsWith("/contact");

  return (
    <nav
      className="grand-mobile-tabbar"
      aria-label="Mobile quick navigation"
    >
      <div className="grand-mobile-tabbar-inner">
        <Link
          href="/"
          className={`grand-mobile-tabbar-item${homeActive ? " grand-mobile-tabbar-item--active" : ""}`}
        >
          <IconHome className="grand-mobile-tabbar-icon" />
          <span>Home</span>
        </Link>

        <Link
          href="/contact"
          className={`grand-mobile-tabbar-enquire${enquireActive ? " grand-mobile-tabbar-enquire--active" : ""}`}
        >
          <span className="grand-mobile-tabbar-enquire-icon" aria-hidden>
            <IconEnquire className="h-6 w-6 text-ivory" />
          </span>
          <span className="grand-mobile-tabbar-enquire-label">Enquire</span>
        </Link>

        <a href={`tel:${tel}`} className="grand-mobile-tabbar-item">
          <IconPhone className="grand-mobile-tabbar-icon" />
          <span>Call</span>
        </a>
      </div>
    </nav>
  );
}
