import Link from "next/link";

const MODULES = [
  { href: "/admin/calendar", title: "Calendar & availability", desc: "Master calendar, block days, range tools, conflicts vs bookings." },
  { href: "/admin/bookings", title: "Bookings & contracts", desc: "Lead → booking, workspace: wedding details, payment schedule, tasks." },
  { href: "/admin/packages", title: "Packages & pricing", desc: "Silver / gold / luxury, add-ons, calculator hooks." },
  { href: "/admin/vendors", title: "Vendors", desc: "Photographers, florists, DJs — directory & per-event links." },
  { href: "/admin/payments", title: "Payments", desc: "Deposits, milestones, gateway integration (stub)." },
  { href: "/admin/invoices", title: "Invoices", desc: "Generate, PDF, reminders (stub)." },
  { href: "/admin/reports", title: "Reports", desc: "Bookings, revenue by month, conversion." },
  { href: "/admin/enquiries", title: "CRM / comms", desc: "Enquiries, follow-up, templates (log comms on booking)." },
];

export default function OperationsPage() {
  return (
    <div className="admin-dash">
      <header className="admin-dash-hero">
        <p className="admin-dash-kicker">Venue CRM</p>
        <h1 className="admin-dash-title">Operations hub</h1>
        <p className="admin-dash-sub">Calendar, bookings workspace, vendors, packages, payments, reports. Run migration <code>015_venue_crm_modules.sql</code> for full data.</p>
      </header>
      <div className="admin-dash-grid">
        {MODULES.map((m) => (
          <Link key={m.href} href={m.href} className="admin-dash-tile">
            <span className="admin-dash-tile-body">
              <span className="admin-dash-tile-title">{m.title}</span>
              <span className="admin-dash-tile-desc">{m.desc}</span>
            </span>
            <span className="admin-dash-tile-arrow">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
