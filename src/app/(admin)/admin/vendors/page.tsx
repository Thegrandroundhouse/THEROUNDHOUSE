"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-api-client";
import { AdminStatsCards } from "@/components/admin/AdminStatsCards";
import { VENDOR_TYPE_OPTIONS, VENDOR_TYPE_VALUE_SET, labelForVendorType } from "@/lib/vendor-types";

type Vendor = {
  id: string;
  name: string;
  vendor_type: string;
  preferred: boolean;
  email?: string | null;
  phone?: string | null;
};

export default function VendorsPage() {
  const [list, setList] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [preferredOnly, setPreferredOnly] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  useEffect(() => {
    adminFetch(`/api/admin/vendors?page=${page}&limit=80`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Could not load vendors"))))
      .then((d) => {
        setList(d.rows || d || []);
        setTotalPages(d.totalPages ?? 1);
        setTotal(d.total ?? 0);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [page]);

  const types = useMemo(() => {
    const s = new Set<string>();
    for (const v of list) s.add(v.vendor_type || "other");
    return Array.from(s).sort();
  }, [list]);

  const extraTypes = useMemo(
    () => types.filter((t) => !VENDOR_TYPE_VALUE_SET.has(t)),
    [types],
  );

  const preferredOnPage = useMemo(() => list.filter((v) => v.preferred).length, [list]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter((v) => {
      if (preferredOnly && !v.preferred) return false;
      if (typeFilter !== "all" && (v.vendor_type || "") !== typeFilter) return false;
      if (!q) return true;
      const name = (v.name || "").toLowerCase();
      const t = (v.vendor_type || "").toLowerCase();
      const email = (v.email || "").toLowerCase();
      return name.includes(q) || t.includes(q) || email.includes(q);
    });
  }, [list, query, typeFilter, preferredOnly]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => (a.name || "").localeCompare(b.name || "")), [filtered]);

  if (loading) {
    return (
      <div className="admin-vnd">
        <div className="admin-bk-skeleton" aria-busy>
          <div className="admin-bk-skeleton-line admin-bk-skeleton-line--lg" />
          <div className="admin-bk-skeleton-grid">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="admin-bk-skeleton-card" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-vnd">
        <div className="admin-bk-error">
          <h1 className="admin-page-title">Vendors</h1>
          <p className="admin-bk-error-msg">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-vnd">
      <div className="admin-page-banner">
        <header className="admin-bk-hero admin-vnd-hero">
          <div className="admin-bk-hero-text">
            <p className="admin-dash-kicker">Suppliers</p>
            <h1 className="admin-page-title admin-bk-title">Vendor directory</h1>
            <p className="admin-lead admin-bk-lead">
              Photographers, caterers, florists — link them on each booking&apos;s workspace. Preferred suppliers surface first in lists.
            </p>
          </div>
          <div className="admin-bk-hero-actions">
            <Link href="/admin/bookings" className="admin-btn admin-btn-ghost">
              Bookings
            </Link>
            <Link href="/admin/vendors/new" className="admin-btn admin-btn-primary">
              + Add vendor
            </Link>
          </div>
        </header>
      </div>

      <div className="admin-stats-unified-wrap">
        <AdminStatsCards
          ariaLabel="Vendor summary"
          items={[
            { label: "Total vendors", value: total, hint: `Page ${page}/${totalPages}` },
            { label: "Preferred (page)", value: preferredOnPage, variant: "accent" },
            { label: "Categories", value: types.length, variant: "ok" },
            { label: "Showing", value: sorted.length, hint: "After filters" },
          ]}
        />
      </div>

      <section className="admin-crm-filters" aria-label="Vendor filters">
        <div className="admin-crm-filters-row admin-vnd-filters-row">
          <label className="admin-vnd-filter-type-label">
            <span>Type</span>
            <select
              className="admin-vnd-filter-type-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label="Filter by supplier type"
            >
              <option value="all">All types</option>
              <optgroup label="Standard types">
                {VENDOR_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </optgroup>
              {extraTypes.length > 0 ? (
                <optgroup label="Custom types in directory">
                  {extraTypes.map((t) => (
                    <option key={t} value={t}>
                      {labelForVendorType(t)}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </select>
          </label>
          <label className="admin-crm-filters-select admin-vnd-preferred-only" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", padding: "0.45rem 0.75rem" }}>
            <input type="checkbox" checked={preferredOnly} onChange={(e) => setPreferredOnly(e.target.checked)} />
            <span style={{ fontSize: "0.8125rem" }}>Preferred only</span>
          </label>
        </div>
        <div className="admin-crm-filters-dates">
          <label className="admin-crm-filters-date-label" style={{ flex: "1 1 280px", maxWidth: "100%" }}>
            <span>Search</span>
            <input
              id="vnd-search"
              type="search"
              className="admin-crm-filters-search"
              style={{ width: "100%", maxWidth: "100%" }}
              placeholder="Name, type, email…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>
      </section>

      {sorted.length === 0 ? (
        <div className="admin-bk-empty">
          <p className="admin-bk-empty-title">{list.length === 0 ? "No vendors yet" : "No matches"}</p>
          <p className="admin-bk-empty-desc">
            {list.length === 0
              ? "Add caterers, photographers and others — then attach them from any booking workspace."
              : "Try clearing filters or search."}
          </p>
          {list.length === 0 && (
            <Link href="/admin/vendors/new" className="admin-btn admin-btn-primary">
              Add first vendor
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="admin-card admin-unified-layout">
            <div className="admin-pay-table-wrap">
              <table className="admin-pay-table">
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>Type</th>
                    <th>Contact</th>
                    <th>Preferred</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((v) => (
                    <tr key={v.id}>
                      <td>
                        <Link href={`/admin/vendors/${v.id}`} className="admin-inv-num">
                          {v.name}
                        </Link>
                      </td>
                      <td>
                        <span className="admin-vnd-type">{labelForVendorType(v.vendor_type || "")}</span>
                      </td>
                      <td>
                        <span className="admin-pay-client">
                          {v.email ? (
                            <a href={`mailto:${v.email}`} className="admin-link">{v.email}</a>
                          ) : (
                            "—"
                          )}
                        </span>
                        {v.phone ? <span className="admin-pay-sub">{v.phone}</span> : null}
                      </td>
                      <td>{v.preferred ? "Yes" : "—"}</td>
                      <td>
                        <Link href={`/admin/vendors/${v.id}`} className="admin-btn admin-btn-sm admin-btn-primary">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {/* Mobile cards */}
          <ul className="admin-vnd-cards">
            {sorted.map((v) => (
              <li key={v.id}>
                <Link href={`/admin/vendors/${v.id}`} className="admin-vnd-card">
                  <div className="admin-vnd-card-top">
                    <strong className="admin-vnd-card-name">{v.name}</strong>
                    {v.preferred ? <span className="admin-vnd-star">Preferred</span> : null}
                  </div>
                  <span className="admin-vnd-type">{labelForVendorType(v.vendor_type || "")}</span>
                  {v.email ? <span className="admin-vnd-card-email">{v.email}</span> : null}
                </Link>
              </li>
            ))}
          </ul>
          <nav className="admin-pay-pager" aria-label="Vendor pages">
            <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </nav>
        </>
      )}
    </div>
  );
}
