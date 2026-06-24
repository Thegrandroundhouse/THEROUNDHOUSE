"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-api-client";

type Row = {
  id: string;
  actor_display_name: string;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  booking_id: string | null;
  booking_code?: string | null;
  summary: string;
  created_at: string;
};

type Filters = {
  q: string;
  bookingId: string;
  entityType: string;
  action: string;
  dateFrom: string;
  dateTo: string;
};

const EMPTY_FILTERS: Filters = {
  q: "",
  bookingId: "",
  entityType: "",
  action: "",
  dateFrom: "",
  dateTo: "",
};

const ACTION_LABELS: Record<string, string> = {
  create: "Create",
  update: "Update",
  delete: "Delete",
  pdf_generated: "PDF export",
  payment_recorded: "Payment",
  workspace_update: "Workspace",
};

const ENTITY_LABELS: Record<string, string> = {
  booking: "Booking",
  vendor: "Vendor",
  enquiry: "Enquiry",
  payment_record: "Payment",
  site_setting: "Settings",
};

function formatAction(action: string): string {
  return ACTION_LABELS[action] || action.replace(/_/g, " ");
}

function formatEntity(type: string): string {
  return ENTITY_LABELS[type] || type.replace(/_/g, " ");
}

function actionPillClass(action: string): string {
  if (action === "delete") return "admin-audit-pill admin-audit-pill--danger";
  if (action === "create") return "admin-audit-pill admin-audit-pill--ok";
  if (action === "pdf_generated") return "admin-audit-pill admin-audit-pill--muted";
  if (action === "payment_recorded") return "admin-audit-pill admin-audit-pill--gold";
  return "admin-audit-pill";
}

function hasFilters(f: Filters) {
  return Boolean(f.q.trim() || f.bookingId.trim() || f.entityType || f.action || f.dateFrom || f.dateTo);
}

function buildSearchParams(page: number, filters: Filters) {
  const sp = new URLSearchParams();
  sp.set("page", String(page));
  sp.set("limit", "25");
  if (filters.entityType) sp.set("entity_type", filters.entityType);
  if (filters.action) sp.set("action", filters.action);
  if (filters.q.trim()) sp.set("q", filters.q.trim());
  const bidTrim = filters.bookingId.trim();
  if (bidTrim) {
    if (/^[0-9a-f-]{36}$/i.test(bidTrim)) sp.set("booking_id", bidTrim);
    else sp.set("booking_code", bidTrim);
  }
  if (filters.dateFrom) sp.set("date_from", filters.dateFrom);
  if (filters.dateTo) sp.set("date_to", filters.dateTo);
  return sp;
}

export default function AuditLogPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const [forbidden, setForbidden] = useState(false);
  const [migration, setMigration] = useState(false);
  const [booting, setBooting] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filterWarning, setFilterWarning] = useState<string | null>(null);
  const requestId = useRef(0);
  const hasLoaded = useRef(false);

  const filterKey = [
    page,
    applied.q,
    applied.bookingId,
    applied.entityType,
    applied.action,
    applied.dateFrom,
    applied.dateTo,
  ].join("\0");

  useEffect(() => {
    const currentRequest = ++requestId.current;
    if (!hasLoaded.current) setBooting(true);
    else setRefreshing(true);
    setLoadError(null);
    setFilterWarning(null);

    const sp = buildSearchParams(page, applied);

    adminFetch(`/api/admin/audit-log?${sp}`)
      .then(async (r) => {
        if (currentRequest !== requestId.current) return;
        if (r.status === 403) {
          setForbidden(true);
          return;
        }
        if (!r.ok) {
          setLoadError("Could not load the audit log. Try refreshing the page.");
          return;
        }
        const d = await r.json();
        setMigration(!!d.needsMigration);
        setRows(Array.isArray(d.rows) ? d.rows : []);
        setTotal(d.total ?? 0);
        setTotalPages(Math.max(1, d.totalPages ?? 1));
        setFilterWarning(typeof d.filterWarning === "string" ? d.filterWarning : null);
      })
      .catch(() => {
        if (currentRequest !== requestId.current) return;
        setLoadError("Could not load the audit log. Check your connection and try again.");
      })
      .finally(() => {
        if (currentRequest !== requestId.current) return;
        hasLoaded.current = true;
        setBooting(false);
        setRefreshing(false);
      });
  }, [filterKey, page, applied]); // filterKey drives refetch; page/applied used in fetch body

  const applyFilters = () => {
    setPage(1);
    setApplied({ ...draft });
  };

  const clearFilters = () => {
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setPage(1);
  };

  if (forbidden) {
    return (
      <div className="admin-audit-v2">
        <div className="admin-page-banner">
          <header className="admin-bk-hero">
            <div className="admin-bk-hero-text">
              <p className="admin-dash-kicker">Admin only</p>
              <h1 className="admin-page-title admin-bk-title">Audit log</h1>
              <p className="admin-lead admin-bk-lead">Only administrators can view the audit log.</p>
            </div>
          </header>
        </div>
        <div className="admin-audit-empty-state">
          <Link href="/admin" className="admin-btn admin-btn-primary">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const filtersOn = hasFilters(applied);

  return (
    <div className="admin-audit-v2">
      <div className="admin-page-banner">
        <header className="admin-bk-hero">
          <div className="admin-bk-hero-text">
            <p className="admin-dash-kicker">Admin only</p>
            <h1 className="admin-page-title admin-bk-title">Audit log</h1>
            <p className="admin-lead admin-bk-lead">Who changed what — bookings, payments, settings, and exports.</p>
          </div>
        </header>
      </div>

      {migration ? (
        <div className="admin-audit-migration-banner" role="status">
          Run migration <code>018_admin_audit_log.sql</code> in Supabase to enable logging.
        </div>
      ) : null}

      {loadError ? (
        <div className="admin-pay-banner" style={{ background: "#fee2e2", borderColor: "#ef4444" }} role="alert">
          {loadError}
        </div>
      ) : null}

      {filterWarning ? (
        <div className="admin-pay-banner" style={{ background: "#fef3c7", borderColor: "#f59e0b" }} role="status">
          {filterWarning}
        </div>
      ) : null}

      <section className="admin-audit-filters" role="search" aria-label="Filter audit log">
        <div className="admin-audit-filters-head">
          <div>
            <h2 className="admin-audit-filters-title">Search the log</h2>
            <p className="admin-audit-filters-desc">Type what you need, then press Search or Enter.</p>
          </div>
          {filtersOn ? (
            <button type="button" className="admin-audit-filters-clear" onClick={clearFilters}>
              Clear
            </button>
          ) : null}
        </div>
        <div className="admin-audit-filters-grid admin-audit-filters-grid--simple">
          <div className="admin-audit-filters-field admin-audit-filters-field--wide">
            <label htmlFor="audit-search" className="admin-audit-filters-label">
              Search text
            </label>
            <input
              id="audit-search"
              type="search"
              className="admin-audit-filters-input admin-bk-simple-input"
              value={draft.q}
              onChange={(e) => setDraft((f) => ({ ...f, q: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyFilters();
              }}
              placeholder="Client name, summary, etc."
            />
          </div>
          <div className="admin-audit-filters-field">
            <label htmlFor="audit-booking" className="admin-audit-filters-label">
              Booking code
            </label>
            <input
              id="audit-booking"
              type="text"
              className="admin-audit-filters-input"
              value={draft.bookingId}
              onChange={(e) => setDraft((f) => ({ ...f, bookingId: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyFilters();
              }}
              placeholder="e.g. TGRH-001"
            />
          </div>
          <div className="admin-audit-filters-actions">
            <button type="button" className="admin-btn admin-btn-primary" onClick={applyFilters} disabled={refreshing}>
              {refreshing ? "Searching…" : "Search"}
            </button>
          </div>
        </div>
        <details className="admin-audit-more-filters">
          <summary>More filters</summary>
          <div className="admin-audit-filters-grid" style={{ marginTop: "0.75rem" }}>
            <div className="admin-audit-filters-field">
              <label htmlFor="audit-entity" className="admin-audit-filters-label">
                Item type
              </label>
              <select
                id="audit-entity"
                className="admin-audit-filters-select"
                value={draft.entityType}
                onChange={(e) => setDraft((f) => ({ ...f, entityType: e.target.value }))}
              >
                <option value="">Any type</option>
                <option value="booking">Booking</option>
                <option value="vendor">Vendor</option>
                <option value="enquiry">Enquiry</option>
                <option value="payment_record">Payment</option>
                <option value="site_setting">Settings</option>
              </select>
            </div>
            <div className="admin-audit-filters-field">
              <label htmlFor="audit-action" className="admin-audit-filters-label">
                Action
              </label>
              <select
                id="audit-action"
                className="admin-audit-filters-select"
                value={draft.action}
                onChange={(e) => setDraft((f) => ({ ...f, action: e.target.value }))}
              >
                <option value="">Any action</option>
                <option value="create">Create</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
                <option value="pdf_generated">PDF export</option>
                <option value="payment_recorded">Payment recorded</option>
                <option value="workspace_update">Workspace update</option>
              </select>
            </div>
            <div className="admin-audit-filters-field admin-audit-filters-field--dates">
              <label className="admin-audit-filters-label">Date range</label>
              <div className="admin-audit-filters-daterow">
                <input
                  type="date"
                  className="admin-audit-filters-input"
                  value={draft.dateFrom}
                  onChange={(e) => setDraft((f) => ({ ...f, dateFrom: e.target.value }))}
                  aria-label="From date"
                />
                <span className="admin-audit-filters-date-sep">to</span>
                <input
                  type="date"
                  className="admin-audit-filters-input"
                  value={draft.dateTo}
                  onChange={(e) => setDraft((f) => ({ ...f, dateTo: e.target.value }))}
                  aria-label="To date"
                />
              </div>
            </div>
          </div>
        </details>
      </section>

      <p className="admin-audit-result-meta" aria-live="polite">
        {booting ? "Loading…" : refreshing ? "Updating…" : null}
        {!booting && !refreshing ? (
          <>
            {total === 0 ? "No entries" : `${total} ${total === 1 ? "entry" : "entries"}`}
            {totalPages > 1 ? ` · page ${page} of ${totalPages}` : ""}
            {filtersOn ? " · filtered" : ""}
          </>
        ) : null}
      </p>

      <div className={`admin-card admin-unified-layout admin-audit-table-card${refreshing ? " admin-audit-table-card--busy" : ""}`}>
        {booting ? (
          <div className="admin-audit-loading" aria-busy="true">
            <p className="admin-settings-loading">Loading audit log…</p>
          </div>
        ) : (
          <div className="admin-audit-table-wrap">
            <table className="admin-audit-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Who</th>
                  <th>Action</th>
                  <th>Item</th>
                  <th>Summary</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="admin-audit-table-empty">
                      {filtersOn
                        ? "Nothing matches — try clearing your search."
                        : migration
                          ? "No entries yet — run migration 018 first."
                          : "No entries yet — activity will appear here automatically."}
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id}>
                      <td className="admin-audit-when">
                        <time dateTime={r.created_at}>{new Date(r.created_at).toLocaleString("en-GB")}</time>
                      </td>
                      <td className="admin-audit-who">
                        <strong>{r.actor_display_name}</strong>
                        {r.actor_email ? <span className="admin-audit-who-email">{r.actor_email}</span> : null}
                      </td>
                      <td>
                        <span className={actionPillClass(r.action)}>{formatAction(r.action)}</span>
                      </td>
                      <td className="admin-audit-entity">
                        <span className="admin-audit-entity-type">{formatEntity(r.entity_type)}</span>
                        {r.booking_code ? <code className="admin-bk-code">{r.booking_code}</code> : null}
                        {r.booking_id ? (
                          <span className="admin-audit-entity-links">
                            <Link href={`/admin/bookings/${r.booking_id}`}>Booking</Link>
                          </span>
                        ) : null}
                      </td>
                      <td className="admin-audit-summary">{r.summary}</td>
                      <td className="admin-audit-row-action">
                        <Link href={`/admin/audit-log/${r.id}`} className="admin-btn admin-btn-ghost admin-btn-sm">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!booting && totalPages > 1 ? (
        <nav className="admin-pay-pager admin-audit-pager" aria-label="Audit log pages">
          <button
            type="button"
            className="admin-btn admin-btn-ghost admin-btn-sm"
            disabled={page <= 1 || refreshing}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className="admin-btn admin-btn-ghost admin-btn-sm"
            disabled={page >= totalPages || refreshing}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </nav>
      ) : null}
    </div>
  );
}
