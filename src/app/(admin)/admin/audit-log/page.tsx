"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-api-client";
import { AdminStatsCards } from "@/components/admin/AdminStatsCards";

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
  payload_before: Record<string, unknown> | null;
  payload_after: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
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

export default function AuditLogPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [forbidden, setForbidden] = useState(false);
  const [migration, setMigration] = useState(false);
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [q, setQ] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);

  const hasActiveFilters = Boolean(entityType || action || q.trim() || bookingId.trim() || dateFrom || dateTo);

  const load = useCallback(async () => {
    setLoading(true);
    const sp = new URLSearchParams();
    sp.set("page", String(page));
    sp.set("limit", "25");
    if (entityType) sp.set("entity_type", entityType);
    if (action) sp.set("action", action);
    if (q.trim()) sp.set("q", q.trim());
    const bidTrim = bookingId.trim();
    if (bidTrim) {
      if (/^[0-9a-f-]{36}$/i.test(bidTrim)) sp.set("booking_id", bidTrim);
      else sp.set("booking_code", bidTrim);
    }
    if (dateFrom) sp.set("date_from", dateFrom);
    if (dateTo) sp.set("date_to", dateTo);
    try {
      const r = await adminFetch(`/api/admin/audit-log?${sp}`);
      if (r.status === 403) {
        setForbidden(true);
        return;
      }
      const d = await r.json();
      if (d.needsMigration) setMigration(true);
      else setMigration(false);
      setRows(d.rows || []);
      setTotal(d.total ?? 0);
      setTotalPages(d.totalPages ?? 1);
    } catch {
      setRows([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, entityType, action, q, bookingId, dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  const applyFilters = () => {
    if (page !== 1) setPage(1);
    else load();
  };

  const clearFilters = () => {
    setEntityType("");
    setAction("");
    setQ("");
    setBookingId("");
    setDateFrom("");
    setDateTo("");
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

  return (
    <div className="admin-audit-v2">
      <div className="admin-page-banner">
        <header className="admin-bk-hero">
          <div className="admin-bk-hero-text">
            <p className="admin-dash-kicker">Admin only</p>
            <h1 className="admin-page-title admin-bk-title">Audit log</h1>
            <p className="admin-lead admin-bk-lead">
              Who did what — bookings, vendors, enquiries, payments, PDF exports, and workspace edits. Filter by booking
              code, date, or summary text.
            </p>
          </div>
          <div className="admin-bk-hero-actions">
            <button type="button" className="admin-btn admin-btn-ghost" disabled={loading} onClick={() => load()}>
              {loading ? "Loading…" : "Refresh"}
            </button>
            <Link href="/admin/staff" className="admin-btn admin-btn-ghost">
              Staff
            </Link>
            <Link href="/admin/settings" className="admin-btn admin-btn-ghost">
              Settings
            </Link>
          </div>
        </header>
      </div>

      {migration ? (
        <div className="admin-audit-migration-banner" role="status">
          Run migration <code>018_admin_audit_log.sql</code> in Supabase to enable logging. New actions are recorded
          automatically once the table exists.
        </div>
      ) : null}

      {!migration ? (
        <div className="admin-stats-unified-wrap">
          <AdminStatsCards
            items={[
              {
                label: "Total entries",
                value: total,
                hint: hasActiveFilters ? "Matching filters" : "All time",
              },
              {
                label: "This page",
                value: rows.length,
                hint: `Page ${page} of ${totalPages}`,
                variant: "gold",
              },
              {
                label: "Filters",
                value: hasActiveFilters ? "On" : "Off",
                hint: hasActiveFilters ? "Clear to see everything" : "Showing all entries",
              },
            ]}
          />
        </div>
      ) : null}

      <section className="admin-audit-filters" role="search" aria-label="Filter audit log">
        <div className="admin-audit-filters-head">
          <div>
            <p className="admin-audit-filters-kicker">Search</p>
            <h2 className="admin-audit-filters-title">Filter the log</h2>
            <p className="admin-audit-filters-desc">Set criteria below, then apply. Press Enter in the search box to apply.</p>
          </div>
          {hasActiveFilters ? (
            <button type="button" className="admin-audit-filters-clear" onClick={clearFilters}>
              Clear all
            </button>
          ) : null}
        </div>
        <div className="admin-audit-filters-grid">
          <div className="admin-audit-filters-field admin-audit-filters-field--wide">
            <label htmlFor="audit-search" className="admin-audit-filters-label">
              Search summary
            </label>
            <input
              id="audit-search"
              type="search"
              className="admin-audit-filters-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyFilters();
              }}
              placeholder="Client name, booking code, or any text…"
            />
          </div>
          <div className="admin-audit-filters-field">
            <label htmlFor="audit-entity" className="admin-audit-filters-label">
              Item type
            </label>
            <select id="audit-entity" className="admin-audit-filters-select" value={entityType} onChange={(e) => setEntityType(e.target.value)}>
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
            <select id="audit-action" className="admin-audit-filters-select" value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="">Any action</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="pdf_generated">PDF export</option>
              <option value="payment_recorded">Payment recorded</option>
              <option value="workspace_update">Workspace update</option>
            </select>
          </div>
          <div className="admin-audit-filters-field">
            <label htmlFor="audit-booking" className="admin-audit-filters-label">
              Booking code or ID
            </label>
            <input
              id="audit-booking"
              type="text"
              className="admin-audit-filters-input"
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              placeholder="e.g. TGRH-001"
            />
          </div>
          <div className="admin-audit-filters-field admin-audit-filters-field--dates">
            <label htmlFor="audit-from" className="admin-audit-filters-label">
              Date range
            </label>
            <div className="admin-audit-filters-daterow">
              <input
                id="audit-from"
                type="date"
                className="admin-audit-filters-input"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                aria-label="From date"
              />
              <span className="admin-audit-filters-date-sep">to</span>
              <input
                id="audit-to"
                type="date"
                className="admin-audit-filters-input"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                aria-label="To date"
              />
            </div>
          </div>
          <div className="admin-audit-filters-actions">
            <button type="button" className="admin-btn admin-btn-primary" onClick={applyFilters}>
              Apply filters
            </button>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="admin-audit-loading" aria-busy="true">
          <p className="admin-settings-loading">Loading audit log…</p>
        </div>
      ) : (
        <>
          <div className="admin-card admin-unified-layout admin-audit-table-card">
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
                        {hasActiveFilters
                          ? "No entries match these filters — try clearing or broadening your search."
                          : migration
                            ? "No entries yet — run migration 018, then activity will appear here."
                            : "No entries yet — admin actions will appear here automatically."}
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
                              <span aria-hidden>·</span>
                              <Link href={`/admin/payments/booking/${r.booking_id}`}>Payments</Link>
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
          </div>

          <nav className="admin-pay-pager admin-audit-pager" aria-label="Audit log pages">
            <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <span>
              Page {page} of {totalPages}
              {total > 0 ? ` · ${total} total` : ""}
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
        </>
      )}
    </div>
  );
}
