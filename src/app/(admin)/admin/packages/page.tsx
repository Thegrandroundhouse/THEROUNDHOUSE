"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch, parseAdminError } from "@/lib/admin-api-client";
import { AdminStatsCards } from "@/components/admin/AdminStatsCards";

export type PkgLine = { label: string; description: string; amount_cents: number };

type PackageRow = {
  id: string;
  name: string;
  description: string | null;
  base_price_cents: number | null;
  line_items: PkgLine[] | null;
  includes: string[] | null;
  active: boolean;
  event_slot_keys?: string[] | null;
};

function gbp(c: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(c / 100);
}

export default function PackagesPage() {
  const [list, setList] = useState<PackageRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(25);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = () => {
    setLoadError(null);
    adminFetch(`/api/admin/packages?page=${page}&limit=${limit}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(await parseAdminError(r, "Couldn’t load packages"));
        return r.json();
      })
      .then((d) => {
        setList(Array.isArray(d.rows) ? d.rows : []);
        setTotalPages(d.totalPages ?? 1);
        setTotal(d.total ?? 0);
      })
      .catch((err) => {
        setList([]);
        setLoadError(err instanceof Error ? err.message : "Couldn’t load packages");
      });
  };
  useEffect(() => {
    load();
  }, [page, limit]);

  const activeCount = list.filter((p) => p.active).length;

  return (
    <div className="admin-pkg-page">
      <div className="admin-page-banner">
        <header className="admin-bk-hero">
          <div className="admin-bk-hero-text">
            <p className="admin-dash-kicker">Catalog</p>
            <h1 className="admin-page-title admin-bk-title">Packages</h1>
            <p className="admin-lead admin-bk-lead">
              Build offers with priced line items and inclusions. When you create a booking, pick a package — totals and notes copy across automatically.
            </p>
          </div>
          <div className="admin-bk-hero-actions">
            <Link href="/admin/bookings/new" className="admin-btn admin-btn-ghost">
              New booking
            </Link>
            <Link href="/admin/packages/new" className="admin-btn admin-btn-primary">
              + Add package
            </Link>
          </div>
        </header>
      </div>

      {loadError ? (
        <div className="admin-pay-banner" style={{ background: "#fee2e2", borderColor: "#ef4444" }} role="alert">
          {loadError}
          <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" style={{ marginLeft: "0.75rem" }} onClick={() => load()}>
            Retry
          </button>
        </div>
      ) : null}

      <div className="admin-stats-unified-wrap">
        <AdminStatsCards
          ariaLabel="Packages summary"
          items={[
            { label: "Total packages", value: total },
            { label: "Active", value: activeCount, variant: "ok" },
            { label: "Inactive", value: list.length - activeCount, hint: "On this page" },
            { label: "Line items", value: list.reduce((s, p) => s + (Array.isArray(p.line_items) ? p.line_items.length : 0), 0), variant: "accent" },
          ]}
        />
      </div>

      {list.length === 0 ? (
        <section className="admin-card admin-unified-layout">
          <div className="admin-bk-empty">
            <p className="admin-bk-empty-title">No packages</p>
            <p className="admin-bk-empty-desc">Create your first package with line items and optional bullet inclusions.</p>
            <Link href="/admin/packages/new" className="admin-btn admin-btn-primary">
              Add package
            </Link>
          </div>
        </section>
      ) : (
        <section className="admin-card admin-unified-layout">
          <h2 className="admin-section-title">Packages</h2>
          <div className="admin-pay-table-wrap">
            <table className="admin-pay-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Total</th>
                  <th>Line items</th>
                  <th>Slots</th>
                  <th>Active</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => {
                  const items = Array.isArray(p.line_items) ? p.line_items : [];
                  return (
                    <tr key={p.id}>
                      <td>
                        <Link href={`/admin/packages/${p.id}`} className="admin-link font-medium">
                          {p.name}
                        </Link>
                      </td>
                      <td style={{ color: "var(--color-text-muted)" }}>
                        {p.description ? `${p.description.slice(0, 80)}${p.description.length > 80 ? "…" : ""}` : "—"}
                      </td>
                      <td>{gbp(p.base_price_cents || 0)}</td>
                      <td>{items.length}</td>
                      <td style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", maxWidth: "8rem" }}>
                        {Array.isArray(p.event_slot_keys) && p.event_slot_keys.length
                          ? p.event_slot_keys.map((k) => (k === "whole_day" ? "Full venue" : k)).join(", ")
                          : "Any"}
                      </td>
                      <td>{p.active ? "Yes" : "No"}</td>
                      <td>
                        <Link href={`/admin/packages/${p.id}`} className="admin-btn admin-btn-sm admin-btn-primary">
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <nav className="admin-pay-pager" aria-label="Package pages">
            <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
            <span className="admin-pay-pager-sep" aria-hidden>·</span>
            <label className="admin-pay-pager-limit">
              Show
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                aria-label="Items per page"
                className="admin-pay-pager-limit-select"
              >
                {[10, 15, 20, 25].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              per page
            </label>
          </nav>
        </section>
      )}
    </div>
  );
}
