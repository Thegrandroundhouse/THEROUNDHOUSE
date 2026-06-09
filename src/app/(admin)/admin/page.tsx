"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-api-client";
import { AdminStatsCards } from "@/components/admin/AdminStatsCards";
import { ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from "recharts";

type UpcomingRow = {
  id: string;
  client_name: string | null;
  client_email: string;
  event_date: string;
  status: string;
  event_type?: string | null;
  booking_code?: string | null;
  total_cents?: number | null;
  event_slot_label?: string;
};

type ReminderRow = {
  id: string;
  title: string;
  body: string | null;
  remind_at: string;
  done: boolean;
  booking_id: string | null;
  invoice_id: string | null;
};

type Summary = {
  bookingsTotal: number;
  enquiriesTotal: number;
  totalRevenuePence?: number;
  series?: { month: string; label: string; revenuePence: number; bookings: number }[];
};

type InvoiceRow = {
  id: string;
  invoice_number: string;
  status: string;
  amount_cents: number;
  client_name?: string | null;
  booking_id?: string | null;
};

type VendorRow = { id: string; name: string; vendor_type?: string | null };

type PaymentRow = {
  id: string;
  amount_cents: number;
  label?: string | null;
  paid_at: string;
  booking_id?: string | null;
  flow?: string;
};

function formatPounds(pence: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(
    pence / 100,
  );
}

function formatDate(s: string) {
  const d = new Date(s);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" });
}

function formatDateTime(s: string) {
  const d = new Date(s);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingRow[]>([]);
  const [reminders, setReminders] = useState<ReminderRow[]>([]);
  const [remindersDueTotal, setRemindersDueTotal] = useState(0);
  const [recentInvoices, setRecentInvoices] = useState<InvoiceRow[]>([]);
  const [invoiceCount, setInvoiceCount] = useState(0);
  const [vendors, setVendors] = useState<{ rows: VendorRow[]; total: number }>({ rows: [], total: 0 });
  const [recentPayments, setRecentPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [me, setMe] = useState<{ displayName: string } | null>(null);

  useEffect(() => {
    adminFetch("/api/admin/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => (j ? setMe({ displayName: j.displayName }) : null));
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setErr(null);
    Promise.all([
      adminFetch("/api/admin/reports/summary").then((r) => (r.ok ? r.json() : null)),
      adminFetch("/api/admin/sidebar-upcoming?limit=12").then((r) => (r.ok ? r.json() : { rows: [] })),
      adminFetch("/api/admin/reminders?done=false&limit=8&page=1").then((r) => (r.ok ? r.json() : { rows: [], total: 0 })),
      adminFetch("/api/admin/invoices").then((r) => (r.ok ? r.json() : [])).then((arr: InvoiceRow[]) => (Array.isArray(arr) ? arr : [])),
      adminFetch("/api/admin/vendors?limit=6").then((r) => (r.ok ? r.json() : { rows: [], total: 0 })),
      adminFetch("/api/admin/payments?limit=6").then((r) => (r.ok ? r.json() : { rows: [] })).then((d: { rows?: PaymentRow[] }) => (d.rows ?? []).slice(0, 6)),
    ])
      .then(([s, u, rem, inv, vend, pay]) => {
        setSummary(s || null);
        setUpcoming(u?.rows ?? []);
        setReminders(rem?.rows ?? []);
        setRemindersDueTotal(typeof rem?.total === "number" ? rem.total : (rem?.rows ?? []).length);
        setRecentInvoices(Array.isArray(inv) ? inv.slice(0, 6) : []);
        setInvoiceCount(Array.isArray(inv) ? inv.length : 0);
        setVendors(vend ?? { rows: [], total: 0 });
        setRecentPayments(pay ?? []);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !summary) {
    return (
      <div className="admin-dash admin-dash--wide">
        <div className="admin-dash-hero">
          <h1 className="admin-dash-title">Dashboard</h1>
        </div>
        <div className="admin-dash-skeleton" aria-hidden>
          <div className="admin-dash-skeleton-stats" />
          <div className="admin-dash-skeleton-grid" />
        </div>
      </div>
    );
  }

  const revenue = summary?.totalRevenuePence ?? 0;
  const series = summary?.series?.slice(-6) ?? [];
  const remindersDue = remindersDueTotal;

  return (
    <div className="admin-dash admin-dash--wide">
      <div className="admin-page-banner">
        <header className="admin-dash-hero">
          <h1 className="admin-dash-title">
            {me?.displayName ? `Welcome back, ${me.displayName}` : "Dashboard"}
          </h1>
          <p className="admin-dash-sub">
            Overview, upcoming bookings and reminders. Follow the pipeline in{" "}
            <Link href="/admin/operations" className="admin-link">
              Operations hub
            </Link>
            {" "}or download the{" "}
            <Link href="/admin/settings?tab=guide" className="admin-link">
              CRM user guide (PDF)
            </Link>
            .
          </p>
        </header>
      </div>

      {err && (
        <div className="admin-bk-error" role="alert">
          <p className="admin-bk-error-msg">{err}</p>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={load}>
            Retry
          </button>
        </div>
      )}

      <div className="admin-stats-unified-wrap">
        <AdminStatsCards
          ariaLabel="Summary"
          items={[
            { label: "Total bookings", value: summary?.bookingsTotal ?? 0 },
            { label: "Enquiries", value: summary?.enquiriesTotal ?? 0 },
            { label: "Revenue (all time)", value: formatPounds(revenue), variant: "gold" },
            { label: "Reminders due", value: remindersDue, variant: remindersDue ? "accent" : "default" },
            { label: "Invoices", value: invoiceCount },
            { label: "Vendors", value: vendors.total },
          ]}
        />
      </div>

      <div className="admin-dash-main">
        <section className="admin-dash-card admin-dash-card--upcoming">
          <h2 className="admin-dash-card-title">
            <Link href="/admin/upcoming">Upcoming bookings</Link>
          </h2>
          {upcoming.length === 0 ? (
            <p className="admin-dash-empty">No upcoming bookings.</p>
          ) : (
            <ul className="admin-dash-list" aria-label="Upcoming bookings">
              {upcoming.map((row) => (
                <li key={row.id}>
                  <Link href={`/admin/bookings/${row.id}`} className="admin-dash-list-link">
                    <span className="admin-dash-list-date">
                      {formatDate(row.event_date)}
                      {row.event_slot_label ? (
                        <span className="admin-dash-list-slot">{row.event_slot_label}</span>
                      ) : null}
                    </span>
                    <span className="admin-dash-list-name">{row.client_name || row.client_email || "—"}</span>
                    <span className={`admin-dash-pill admin-dash-pill--${row.status}`}>{row.status}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href="/admin/upcoming" className="admin-dash-card-more">
            View all upcoming →
          </Link>
        </section>

        <section className="admin-dash-card admin-dash-card--chart">
          <h2 className="admin-dash-card-title">Revenue (last 6 months)</h2>
          {series.length === 0 ? (
            <p className="admin-dash-empty">No data yet.</p>
          ) : (
            <div className="admin-dash-chart-wrap">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--color-text-muted)" />
                  <YAxis tickFormatter={(v) => `£${(v / 100).toFixed(0)}`} tick={{ fontSize: 11 }} stroke="var(--color-text-muted)" />
                  <Tooltip
                    formatter={(v) => [formatPounds(Number(v ?? 0)), "Revenue"]}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.label}
                  />
                  <Bar dataKey="revenuePence" fill="var(--color-gold)" radius={[4, 4, 0, 0]} name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <Link href="/admin/reports" className="admin-dash-card-more">
            Full reports →
          </Link>
        </section>

        <section className="admin-dash-card admin-dash-card--reminders">
          <h2 className="admin-dash-card-title">
            <Link href="/admin/reminders">Reminders</Link>
          </h2>
          {reminders.length === 0 ? (
            <p className="admin-dash-empty">No upcoming reminders.</p>
          ) : (
            <ul className="admin-dash-list" aria-label="Upcoming reminders">
              {reminders.map((r) => (
                <li key={r.id}>
                  <Link href="/admin/reminders" className="admin-dash-list-link">
                    <span className="admin-dash-list-date">{formatDateTime(r.remind_at)}</span>
                    <span className="admin-dash-list-name">{r.title}</span>
                    {r.booking_id && (
                      <span className="admin-dash-pill admin-dash-pill--muted">Booking</span>
                    )}
                    {r.invoice_id && (
                      <span className="admin-dash-pill admin-dash-pill--muted">Invoice</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href="/admin/reminders" className="admin-dash-card-more">
            Manage reminders →
          </Link>
        </section>

        <section className="admin-dash-card admin-dash-card--invoices">
          <h2 className="admin-dash-card-title">
            <Link href="/admin/invoices">Recent invoices</Link>
          </h2>
          {recentInvoices.length === 0 ? (
            <p className="admin-dash-empty">No invoices yet.</p>
          ) : (
            <ul className="admin-dash-list" aria-label="Recent invoices">
              {recentInvoices.map((inv) => (
                <li key={inv.id}>
                  <Link href={`/admin/invoices/${inv.id}`} className="admin-dash-list-link">
                    <span className="admin-dash-list-date">{inv.invoice_number}</span>
                    <span className="admin-dash-list-name">{inv.client_name || "—"}</span>
                    <span className="admin-dash-pill admin-dash-pill--muted">{formatPounds(inv.amount_cents)}</span>
                    <span className={`admin-dash-pill admin-dash-pill--${inv.status}`}>{inv.status}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href="/admin/invoices" className="admin-dash-card-more">
            View all invoices →
          </Link>
        </section>

        <section className="admin-dash-card admin-dash-card--vendors">
          <h2 className="admin-dash-card-title">
            <Link href="/admin/vendors">Vendors</Link>
          </h2>
          {vendors.rows.length === 0 ? (
            <p className="admin-dash-empty">No vendors yet.</p>
          ) : (
            <ul className="admin-dash-list" aria-label="Vendors">
              {vendors.rows.map((v) => (
                <li key={v.id}>
                  <Link href={`/admin/vendors/${v.id}`} className="admin-dash-list-link">
                    <span className="admin-dash-list-name">{v.name}</span>
                    {v.vendor_type && (
                      <span className="admin-dash-pill admin-dash-pill--muted">{v.vendor_type}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href="/admin/vendors" className="admin-dash-card-more">
            View all {vendors.total} vendors →
          </Link>
        </section>

        <section className="admin-dash-card admin-dash-card--payments">
          <h2 className="admin-dash-card-title">
            <Link href="/admin/payments">Recent payments</Link>
          </h2>
          {recentPayments.length === 0 ? (
            <p className="admin-dash-empty">No payments yet.</p>
          ) : (
            <ul className="admin-dash-list" aria-label="Recent payments">
              {recentPayments.map((p) => (
                <li key={p.id}>
                  <Link href="/admin/payments" className="admin-dash-list-link">
                    <span className="admin-dash-list-date">{formatDate(p.paid_at)}</span>
                    <span className="admin-dash-list-name">{p.label || "Payment"}</span>
                    <span className="admin-dash-pill admin-dash-pill--muted">{formatPounds(p.amount_cents)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href="/admin/payments" className="admin-dash-card-more">
            View all payments →
          </Link>
        </section>

      </div>
    </div>
  );
}
