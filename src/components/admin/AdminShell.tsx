"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { ADMIN_APP_NAME, ADMIN_APP_TAGLINE } from "@/lib/venue-constants";
import SignOutButton from "@/components/auth/SignOutButton";
import { adminFetch } from "@/lib/admin-api-client";
import { AdminGlobalSearch } from "@/components/admin/AdminGlobalSearch";
import { createClient } from "@/lib/supabase/client";

type NavItem = { label: string; href: string; icon: React.ReactNode };

const IconDash = () => (
  <svg className="admin-nav-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="11" width="7" height="10" rx="1.5" />
    <rect x="3" y="15" width="7" height="6" rx="1.5" />
  </svg>
);
const IconGrid = () => (
  <svg className="admin-nav-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
    <path d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z" />
  </svg>
);
const IconCal = () => (
  <svg className="admin-nav-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);
const IconBook = () => (
  <svg className="admin-nav-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
    <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
  </svg>
);
const IconMail = () => (
  <svg className="admin-nav-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <path d="M22 6l-10 7L2 6" />
  </svg>
);
const IconVendor = () => (
  <svg className="admin-nav-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
  </svg>
);
const IconPkg = () => (
  <svg className="admin-nav-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
    <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
  </svg>
);
const IconPay = () => (
  <svg className="admin-nav-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
    <rect x="1" y="4" width="22" height="16" rx="2" />
    <path d="M1 10h22" />
  </svg>
);
const IconInvoice = () => (
  <svg className="admin-nav-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
  </svg>
);
const IconAgreement = () => (
  <svg className="admin-nav-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M9 15l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconChart = () => (
  <svg className="admin-nav-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
    <path d="M18 20V10M12 20V4M6 20v-6" />
  </svg>
);
const IconStaff = () => (
  <svg className="admin-nav-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M13 7a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87" />
  </svg>
);
const IconGear = () => (
  <svg className="admin-nav-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
);
const IconAudit = () => (
  <svg className="admin-nav-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    <path d="M9 21l3-3 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconBell = () => (
  <svg className="admin-nav-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 01-3.46 0" />
  </svg>
);
const IconProfile = () => (
  <svg className="admin-nav-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 14a4 4 0 004-4 4 4 0 00-8 0 4 4 0 004 4z" />
    <path d="M8 20c2-2 4-3 4-3s2 1 4 3" />
  </svg>
);

type MeState = { displayName: string; role: string } | null;

function NavGroups({
  pathname,
  onNavigate,
  showAudit,
}: {
  pathname: string;
  onNavigate?: () => void;
  showAudit: boolean;
}) {
  const groups: { title: string; items: NavItem[] }[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/admin", icon: <IconDash /> },
      { label: "Operations hub", href: "/admin/operations", icon: <IconGrid /> },
      { label: "Reminders", href: "/admin/reminders", icon: <IconBell /> },
    ],
  },
  {
    title: "Sales pipeline",
    items: [
      { label: "Enquiries", href: "/admin/enquiries", icon: <IconMail /> },
      { label: "Calendar", href: "/admin/calendar", icon: <IconCal /> },
      { label: "Bookings", href: "/admin/bookings", icon: <IconBook /> },
      { label: "Upcoming", href: "/admin/upcoming", icon: <IconCal /> },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Payments", href: "/admin/payments", icon: <IconPay /> },
      { label: "Invoices", href: "/admin/invoices", icon: <IconInvoice /> },
      { label: "Agreements", href: "/admin/agreements", icon: <IconAgreement /> },
      { label: "Reports", href: "/admin/reports", icon: <IconChart /> },
      { label: "Season pricing", href: "/admin/pricing", icon: <IconCal /> },
    ],
  },
  {
    title: "Catalogue",
    items: [
      { label: "Packages", href: "/admin/packages", icon: <IconPkg /> },
      { label: "Vendors", href: "/admin/vendors", icon: <IconVendor /> },
    ],
  },
  {
    title: "Team & settings",
    items: [
      { label: "Staff", href: "/admin/staff", icon: <IconStaff /> },
      ...(showAudit ? [{ label: "Audit log", href: "/admin/audit-log", icon: <IconAudit /> }] as NavItem[] : []),
      { label: "Settings", href: "/admin/settings", icon: <IconGear /> },
    ],
  },
  ];
  return (
    <nav className="admin-sidebar-nav" aria-label="Admin navigation">
      {groups.map((group) => (
        <div key={group.title} className="admin-sidebar-group">
          <h3 className="admin-sidebar-group-title">{group.title}</h3>
          <ul className="admin-sidebar-group-list">
            {group.items.map(({ label, href, icon }) => {
              const active =
                pathname === href || (href !== "/admin" && (pathname === href || pathname.startsWith(href + "/")));
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    className={active ? "admin-nav-row admin-nav-row--active" : "admin-nav-row"}
                  >
                    <span className="admin-nav-icon-wrap" aria-hidden>
                      {icon}
                    </span>
                    <span className="admin-nav-label">{label}</span>
                    {active ? <span className="admin-nav-active-dot" aria-hidden /> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<MeState>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [navRailCollapsed, setNavRailCollapsed] = useState(false);
  const [navRailHover, setNavRailHover] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage.getItem("admin_nav_rail") === "1") {
        setNavRailCollapsed(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    adminFetch("/api/admin/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => (j ? setMe({ displayName: j.displayName, role: j.role }) : null));
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!profileOpen) return;
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [profileOpen]);

  async function handleSignOut() {
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    router.replace("/admin-login");
    router.refresh();
  }

  return (
    <div className="admin-shell">
      <div className="admin-shell-body">
        <aside
          className={`admin-sidebar-desktop ${navRailCollapsed ? "admin-sidebar-desktop--rail" : ""} ${navRailCollapsed && navRailHover ? "admin-sidebar-desktop--rail-hover" : ""}`}
          onMouseEnter={() => navRailCollapsed && setNavRailHover(true)}
          onMouseLeave={() => navRailCollapsed && setNavRailHover(false)}
        >
          <div className="admin-sidebar-header">
            <button
              type="button"
              className="admin-sidebar-rail-toggle"
              onClick={() => {
                setNavRailCollapsed((c) => {
                  const next = !c;
                  try {
                    window.localStorage.setItem("admin_nav_rail", next ? "1" : "0");
                  } catch {
                    /* ignore */
                  }
                  return next;
                });
                setNavRailHover(false);
              }}
              aria-label={navRailCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={navRailCollapsed ? "Expand menu" : "Collapse to icons"}
            >
              {navRailCollapsed ? "»" : "«"}
            </button>
            <Link href="/admin" className="admin-sidebar-logo-link" title={`${ADMIN_APP_NAME} — ${ADMIN_APP_TAGLINE}`}>
              <span className="admin-sidebar-logo-mark" aria-hidden>
                R
              </span>
              <div>
                <span className="admin-sidebar-logo-title">{ADMIN_APP_NAME}</span>
                <span className="admin-sidebar-logo-sub">{ADMIN_APP_TAGLINE}</span>
              </div>
            </Link>
          </div>
          <div className="admin-sidebar-scroll">
            <NavGroups pathname={pathname} showAudit={me?.role === "admin"} />
          </div>
          <div className="admin-sidebar-footer">
            <Link href="/" className="admin-sidebar-btn admin-sidebar-btn--outline" target="_blank" rel="noopener noreferrer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
              </svg>
              Open public site
            </Link>
            <SignOutButton className="admin-sidebar-btn admin-sidebar-btn--signout" />
          </div>
        </aside>

        <aside className={`admin-sidebar-drawer ${open ? "admin-sidebar-drawer--open" : ""}`}>
          <div className="admin-drawer-top">
            <div className="admin-drawer-brand">
              <span className="admin-sidebar-logo-mark" aria-hidden>
                R
              </span>
              <div>
                <span className="admin-drawer-brand-text">{ADMIN_APP_NAME}</span>
                <span className="admin-drawer-brand-sub">{ADMIN_APP_TAGLINE}</span>
              </div>
            </div>
            <button type="button" className="admin-drawer-x" onClick={() => setOpen(false)} aria-label="Close menu">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="admin-sidebar-scroll">
            <NavGroups pathname={pathname} onNavigate={() => setOpen(false)} showAudit={me?.role === "admin"} />
          </div>
          <div className="admin-sidebar-footer admin-sidebar-footer--drawer">
            <Link href="/" className="admin-sidebar-btn admin-sidebar-btn--outline" onClick={() => setOpen(false)} target="_blank" rel="noopener noreferrer">
              Open public site
            </Link>
            <SignOutButton className="admin-sidebar-btn admin-sidebar-btn--signout" />
          </div>
        </aside>

        {open ? (
          <button type="button" className="admin-overlay" aria-label="Close menu" onClick={() => setOpen(false)} />
        ) : null}

        <div className={`admin-content-column ${navRailCollapsed ? "admin-content-column--nav-rail" : ""}`}>
          <header className="admin-topbar">
            <div className="admin-topbar-inner">
              <button
                type="button"
                className="admin-menu-btn"
                onClick={() => setOpen(true)}
                aria-expanded={open}
                aria-label="Open menu"
              >
                <span className="admin-menu-line" />
                <span className="admin-menu-line" />
                <span className="admin-menu-line" />
              </button>
              <AdminGlobalSearch />
              <div className="admin-topbar-right" ref={profileRef}>
                {me ? (
                  <>
                    <button
                      type="button"
                      className="admin-topbar-user"
                      onClick={() => setProfileOpen((o) => !o)}
                      aria-expanded={profileOpen}
                      aria-haspopup="true"
                      aria-label="Account menu"
                      title={me.role === "admin" ? "Administrator" : "Staff"}
                    >
                      <span className="admin-topbar-user-profile-icon" aria-hidden>
                        <IconProfile />
                      </span>
                      <div className="admin-topbar-user-text">
                        <span className="admin-topbar-user-name">{me.displayName}</span>
                        <span className="admin-topbar-user-role">{me.role === "admin" ? "Administrator" : "Staff"}</span>
                      </div>
                      <span className="admin-topbar-user-chevron" aria-hidden>
                        {profileOpen ? "▲" : "▼"}
                      </span>
                    </button>
                    {profileOpen && (
                      <div className="admin-topbar-dropdown" role="menu">
                        <Link href="/" className="admin-topbar-dropdown-item" role="menuitem" target="_blank" rel="noopener noreferrer" onClick={() => setProfileOpen(false)}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                          </svg>
                          View site
                        </Link>
                        <Link href="/admin/settings" className="admin-topbar-dropdown-item" role="menuitem" onClick={() => setProfileOpen(false)}>
                          <IconGear />
                          Settings
                        </Link>
                        <button type="button" className="admin-topbar-dropdown-item admin-topbar-dropdown-item--signout" role="menuitem" onClick={() => { setProfileOpen(false); handleSignOut(); }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                          </svg>
                          Sign out
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <Link href="/" className="admin-topbar-exit" target="_blank" rel="noopener noreferrer">
                    View site
                  </Link>
                )}
              </div>
            </div>
          </header>
          <main className="admin-main">{children}</main>
        </div>
      </div>
    </div>
  );
}
