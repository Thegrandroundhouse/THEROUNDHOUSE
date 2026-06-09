import Link from "next/link";

const PIPELINE = [
  { step: 1, href: "/admin/enquiries", title: "Enquiries", desc: "Leads from the website. Hold dates, quote, convert to booking." },
  { step: 2, href: "/admin/calendar", title: "Calendar", desc: "See free dates & slots. Block days. Jump to new booking." },
  { step: 3, href: "/admin/bookings", title: "Bookings", desc: "Central event record — client, package, money, workspace." },
  { step: 4, href: "/admin/agreements", title: "Contracts", desc: "Templates + generate hire PDF from booking tab 3." },
  { step: 5, href: "/admin/payments", title: "Payments", desc: "Deposits & milestones linked to each booking." },
  { step: 6, href: "/admin/invoices", title: "Invoices", desc: "Client bills using Settings business & logo." },
];

const MODULES = [
  { href: "/admin", title: "Dashboard", desc: "KPIs, charts, upcoming events, reminders." },
  { href: "/admin/reminders", title: "Reminders", desc: "Staff to-dos; can link to booking or invoice." },
  { href: "/admin/upcoming", title: "Upcoming", desc: "Future bookings list by event date." },
  { href: "/admin/packages", title: "Packages", desc: "Prices & line items → bookings & contracts." },
  { href: "/admin/vendors", title: "Vendors", desc: "Supplier directory → link on booking." },
  { href: "/admin/reports", title: "Reports", desc: "Revenue & booking summaries." },
  { href: "/admin/pricing", title: "Season pricing", desc: "Seasonal rate rules." },
  { href: "/admin/staff", title: "Staff", desc: "Team access to admin." },
  { href: "/admin/settings", title: "Settings", desc: "Logo, business/bank, slots — feeds all PDFs." },
];

export default function OperationsPage() {
  return (
    <div className="admin-dash">
      <header className="admin-dash-hero admin-page-banner">
        <p className="admin-dash-kicker">Venue CRM</p>
        <h1 className="admin-dash-title">Operations hub</h1>
        <p className="admin-dash-sub">
          Everything in the admin connects through the booking. Follow the pipeline left to right, then use workspace tabs on
          each booking. Download the full PDF from{" "}
          <Link href="/admin/settings" className="admin-link">
            Settings → User guide
          </Link>
          .
        </p>
      </header>

      <section className="admin-ops-pipeline" aria-label="Sales pipeline">
        <h2 className="admin-ops-section-title">Sales pipeline (in order)</h2>
        <div className="admin-ops-pipeline-grid">
          {PIPELINE.map((m) => (
            <Link key={m.href} href={m.href} className="admin-ops-pipeline-step">
              <span className="admin-ops-pipeline-num">{m.step}</span>
              <span className="admin-ops-pipeline-body">
                <span className="admin-ops-pipeline-title">{m.title}</span>
                <span className="admin-ops-pipeline-desc">{m.desc}</span>
              </span>
              <span className="admin-dash-tile-arrow">→</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="admin-ops-modules" aria-label="All modules">
        <h2 className="admin-ops-section-title">All modules</h2>
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
      </section>

      <section className="admin-card admin-ops-connect" style={{ marginTop: "1.5rem", padding: "1.25rem" }}>
        <h2 className="admin-card-heading" style={{ marginTop: 0 }}>
          How it connects
        </h2>
        <p className="admin-settings-desc">
          <strong>Settings</strong> (business, bank, slots, logo) → <strong>Calendar &amp; bookings</strong> →{" "}
          <strong>Package</strong> sets price &amp; contract lines → <strong>Agreement PDF</strong> →{" "}
          <strong>Payments &amp; invoices</strong> → <strong>Reports</strong>. Each booking workspace tab adds detail (wedding,
          tasks, vendors, docs, comms) without leaving the record.
        </p>
        <Link href="/admin/settings" className="admin-btn admin-btn-primary" style={{ marginTop: "0.75rem", display: "inline-flex" }}>
          Open Settings &amp; download PDF guide
        </Link>
      </section>
    </div>
  );
}
