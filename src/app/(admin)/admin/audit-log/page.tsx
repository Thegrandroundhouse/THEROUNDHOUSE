"use client";

import { useEffect, useState, useCallback } from "react";
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
  payload_before: Record<string, unknown> | null;
  payload_after: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export default function AuditLogPage() {
  const [rows, setRows] = useState<Row[]>([]);
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

  const load = useCallback(async (pageOverride?: number) => {
    setLoading(true);
    const p = pageOverride ?? page;
    const sp = new URLSearchParams();
    sp.set("page", String(p));
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
    adminFetch(`/api/admin/audit-log?${sp}`)
      .then(async (r) => {
        if (r.status === 403) {
          setForbidden(true);
          return;
        }
        const d = await r.json();
        if (d.needsMigration) setMigration(true);
        setRows(d.rows || []);
        setTotalPages(d.totalPages ?? 1);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [page, entityType, action, q, bookingId, dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  const applyFilters = () => {
    setPage(1);
    load(1);
  };

  const clearFilters = () => {
    setEntityType("");
    setAction("");
    setQ("");
    setBookingId("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
    setTimeout(() => load(1), 0);
  };

  const hasActiveFilters = entityType || action || q.trim() || bookingId.trim() || dateFrom || dateTo;

  if (forbidden) {
    return (
      <div className="admin-bk">
        <h1 className="admin-page-title">Audit log</h1>
        <p className="admin-lead">Only administrators can view the audit log.</p>
        <Link href="/admin" className="admin-btn admin-btn-primary">
          Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="admin-pay">
      <div className="admin-page-banner">
        <header className="admin-bk-hero">
          <div className="admin-bk-hero-text">
            <p className="admin-dash-kicker">Admin only</p>
            <h1 className="admin-page-title admin-bk-title">Audit log</h1>
            <p className="admin-lead admin-bk-lead">
              Who did what: bookings, vendors, enquiries, payments, PDF exports, workspace edits. Staff names from Staff directory. Filter by booking code or ID.
            </p>
          </div>
        </header>
      </div>

      {migration && (
        <p className="admin-pay-banner">
          Run migration <code>018_admin_audit_log.sql</code> to enable logging. New actions are recorded automatically.
        </p>
      )}

      <section className="admin-audit-filters" role="search" aria-label="Filter audit log">
        <div className="admin-audit-filters-head">
          <div>
            <h2 className="admin-audit-filters-title">Filter the log</h2>
            <p className="admin-audit-filters-desc">Choose criteria below, then click Apply to see matching entries.</p>
          </div>
          {hasActiveFilters ? (
            <button type="button" className="admin-audit-filters-clear" onClick={clearFilters}>
              Clear all
            </button>
          ) : null}
        </div>
        <div className="admin-audit-filters-grid">
          <div className="admin-audit-filters-field">
            <label htmlFor="audit-search" className="admin-audit-filters-label">Search in summary</label>
            <span className="admin-audit-filters-hint">e.g. client name, booking code, or any text in the summary</span>
            <input
              id="audit-search"
              type="search"
              className="admin-audit-filters-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Type to search…"
            />
          </div>
          <div className="admin-audit-filters-field">
            <label htmlFor="audit-entity" className="admin-audit-filters-label">What was changed</label>
            <span className="admin-audit-filters-hint">Booking, enquiry, payment, etc.</span>
            <select id="audit-entity" className="admin-audit-filters-select" value={entityType} onChange={(e) => setEntityType(e.target.value)}>
              <option value="">Any</option>
              <option value="booking">Booking</option>
              <option value="vendor">Vendor</option>
              <option value="enquiry">Enquiry</option>
              <option value="payment_record">Payment</option>
              <option value="site_setting">Site / settings</option>
            </select>
          </div>
          <div className="admin-audit-filters-field">
            <label htmlFor="audit-action" className="admin-audit-filters-label">What they did</label>
            <span className="admin-audit-filters-hint">Create, update, delete, export…</span>
            <select id="audit-action" className="admin-audit-filters-select" value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="">Any</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="pdf_generated">PDF generated</option>
              <option value="payment_recorded">Payment recorded</option>
              <option value="workspace_update">Workspace update</option>
            </select>
          </div>
          <div className="admin-audit-filters-field">
            <label htmlFor="audit-booking" className="admin-audit-filters-label">Booking code or ID</label>
            <span className="admin-audit-filters-hint">Only show entries linked to this booking</span>
            <input
              id="audit-booking"
              type="text"
              className="admin-audit-filters-input"
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              placeholder="e.g. TGRH-001"
            />
          </div>
          <div className="admin-audit-filters-field admin-audit-filters-date">
            <label htmlFor="audit-from" className="admin-audit-filters-label">When it was recorded</label>
            <span className="admin-audit-filters-hint">From and to date</span>
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
        <div className="admin-bk-skeleton-line admin-bk-skeleton-line--lg" aria-busy />
      ) : (
        <>
      <div className="admin-pay-table-wrap">
        <table className="admin-pay-table admin-audit-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Who</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Summary</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-muted)" }}>
                  No entries yet — activity will appear after migration 018 and admin actions.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td>{new Date(r.created_at).toLocaleString("en-GB")}</td>
                  <td>
                    <strong>{r.actor_display_name}</strong>
                    {r.actor_email ? <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>{r.actor_email}</div> : null}
                  </td>
                  <td>{r.action}</td>
                  <td>
                    {r.booking_code ? <code className="admin-bk-code">{r.booking_code}</code> : null}
                    <span>{r.entity_type}</span>
                    {r.booking_id ? (
                      <div>
                        <Link href={`/admin/bookings/${r.booking_id}`}>Booking</Link>
                        {" · "}
                        <Link href={`/admin/payments/booking/${r.booking_id}`}>Payments</Link>
                      </div>
                    ) : null}
                  </td>
                  <td style={{ maxWidth: 280 }}>{r.summary}</td>
                  <td>
                    <Link href={`/admin/audit-log/${r.id}`} className="admin-btn admin-btn-ghost" style={{ fontSize: "0.75rem" }}>
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <nav className="admin-pay-pager" aria-label="Audit log pages">
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
