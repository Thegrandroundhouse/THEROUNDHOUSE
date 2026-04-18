"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-api-client";
import { AdminStatsCards } from "@/components/admin/AdminStatsCards";

const FLOW_LABEL: Record<string, string> = {
  customer_in: "Client → venue",
  vendor_out: "Venue → supplier",
  vendor_in: "Supplier → venue",
  adjustment: "Adjustment",
};

function gbp(c: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(c / 100);
}

type Row = {
  id: string;
  booking_id: string;
  flow: string;
  amount_cents: number;
  label: string;
  paid_at: string;
  client_name?: string | null;
  client_email?: string;
  event_date?: string;
  booking_code?: string | null;
  vendor_name?: string | null;
};

export default function PaymentsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [migration, setMigration] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [flowFilter, setFlowFilter] = useState<"all" | Row["flow"]>("all");
  const [searchQ, setSearchQ] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    const p = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (flowFilter !== "all") p.set("flow", flowFilter);
    if (searchQ.trim().length >= 2) p.set("q", searchQ.trim());
    adminFetch(`/api/admin/payments?${p}`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error((d as { error?: string }).error || r.statusText);
        return d;
      })
      .then((d) => {
        if (d.needsMigration) setMigration(true);
        else setMigration(false);
        setRows(d.rows || []);
        setTotal(d.total ?? 0);
        setTotalPages(d.totalPages ?? 1);
      })
      .catch((e) => {
        setLoadError(e instanceof Error ? e.message : "Could not load ledger");
        setRows([]);
        setTotal(0);
        setTotalPages(1);
      })
      .finally(() => setLoading(false));
  }, [page, limit, flowFilter, searchQ]);

  useEffect(() => {
    setPage(1);
  }, [flowFilter, searchQ]);

  useEffect(() => {
    load();
  }, [load]);

  const flowSeg = useMemo(
    () =>
      [
        ["all", "All"],
        ["customer_in", "Client in"],
        ["vendor_out", "Supplier out"],
        ["vendor_in", "Supplier in"],
        ["adjustment", "Adjust"],
      ] as const,
    [],
  );

  return (
    <div className="admin-pay">
      <div className="admin-page-banner">
        <header className="admin-bk-hero">
          <div className="admin-bk-hero-text">
            <p className="admin-dash-kicker">Finance</p>
            <h1 className="admin-page-title admin-bk-title">Payments ledger</h1>
            <p className="admin-lead admin-bk-lead">
              Every movement: client payments in, supplier payouts, adjustments. View a booking for the full breakdown.
            </p>
          </div>
          <div className="admin-bk-hero-actions">
            <Link href="/admin/pricing" className="admin-btn admin-btn-ghost">
              Season pricing
            </Link>
            <Link href="/admin/bookings" className="admin-btn admin-btn-primary">
              Bookings
            </Link>
          </div>
        </header>
      </div>

      {loadError && (
        <div className="admin-pay-banner" style={{ background: "#fee2e2", borderColor: "#ef4444" }}>
          {loadError}
        </div>
      )}

      {migration && (
        <div className="admin-pay-banner">
          Run migration <code>017_vendors_payments_seasons.sql</code> to enable the payments table.
        </div>
      )}

      {!migration && rows.length >= 0 && (
        <div className="admin-stats-unified-wrap">
          <AdminStatsCards
            items={[
              {
                label: "Entries (page)",
                value: rows.length,
                hint: `Total ledger ${total}`,
              },
              {
                label: "Client in (page)",
                value: gbp(rows.filter((r) => r.flow === "customer_in").reduce((s, r) => s + r.amount_cents, 0)),
                variant: "gold",
              },
              {
                label: "Supplier out (page)",
                value: gbp(rows.filter((r) => r.flow === "vendor_out").reduce((s, r) => s + r.amount_cents, 0)),
              },
              {
                label: "Adjustments",
                value: gbp(rows.filter((r) => r.flow === "adjustment").reduce((s, r) => s + r.amount_cents, 0)),
                variant: "accent",
              },
            ]}
          />
        </div>
      )}

      <section className="admin-crm-filters" aria-label="Payments filters">
        <div className="admin-crm-filters-row">
          <span className="admin-crm-filters-inline-label">Flow</span>
          <div className="admin-crm-filters-seg" role="group">
            {flowSeg.map(([k, lab]) => (
              <button
                key={k}
                type="button"
                className={
                  flowFilter === k ? "admin-crm-filters-seg-btn admin-crm-filters-seg-btn--on" : "admin-crm-filters-seg-btn"
                }
                onClick={() => setFlowFilter(k)}
              >
                {lab}
              </button>
            ))}
          </div>
        </div>
        <div className="admin-crm-filters-dates">
          <label className="admin-crm-filters-date-label" style={{ flex: "1 1 280px", maxWidth: "100%" }}>
            <span>Search label / notes</span>
            <input
              type="search"
              className="admin-crm-filters-search"
              style={{ width: "100%", maxWidth: "100%" }}
              placeholder="Min 2 characters…"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
            />
          </label>
        </div>
      </section>

      {loading ? (
        <div className="admin-bk-skeleton-line admin-bk-skeleton-line--lg" />
      ) : (
        <>
          <div className="admin-card admin-unified-layout">
            <div className="admin-pay-table-wrap">
              <table className="admin-pay-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Flow</th>
                  <th>Amount</th>
                  <th>Label</th>
                  <th>Booking / client</th>
                  <th>Supplier</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="admin-pay-empty">
                      No payments logged yet. Add entries from a booking&apos;s payment detail page.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id}>
                      <td>{new Date(r.paid_at).toLocaleDateString("en-GB")}</td>
                      <td>
                        <span className={`admin-pay-flow admin-pay-flow--${r.flow}`}>{FLOW_LABEL[r.flow] || r.flow}</span>
                      </td>
                      <td className="admin-pay-amt">{gbp(r.amount_cents)}</td>
                      <td>{r.label}</td>
                      <td>
                        {r.booking_code && <code className="admin-bk-code">{r.booking_code}</code>}
                        <span className="admin-pay-client">{r.client_name || r.client_email || "—"}</span>
                        <span className="admin-pay-sub">{r.event_date}</span>
                      </td>
                      <td>{r.vendor_name || "—"}</td>
                      <td>
                        <Link href={`/admin/payments/booking/${r.booking_id}`} className="admin-btn admin-btn-sm admin-btn-primary">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              </table>
            </div>
          </div>
          {totalPages > 1 ? (
            <nav className="admin-pay-pager" aria-label="Payment pages">
              <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className="admin-btn admin-btn-ghost admin-btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}
