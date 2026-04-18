"use client";

import type React from "react";
import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import type { Enquiry, EnquiryStatus } from "@/types/crm";
import { adminFetch } from "@/lib/admin-api-client";
import { AdminStatsCards } from "@/components/admin/AdminStatsCards";
import { useAdminDialog } from "@/components/admin/AdminDialogContext";
import { AdminCrmExportModal } from "@/components/admin/AdminCrmExportModal";
import {
  ENQUIRIES_EXPORT_COLUMNS_DEFAULT,
  ENQUIRIES_EXPORT_COLUMN_LABELS,
  type EnquiriesListExportColumns,
} from "@/lib/enquiries-export-columns";

const STATUS_LABELS: Record<EnquiryStatus, string> = {
  new: "New",
  contacted: "Contacted",
  quoted: "Quoted",
  converted: "Converted",
  lost: "Lost",
};

const STATUS_ORDER: EnquiryStatus[] = ["new", "contacted", "quoted", "converted", "lost"];

const ENQ_COL_NONE: EnquiriesListExportColumns = {
  name: false,
  email: false,
  phone: false,
  functionType: false,
  eventDate: false,
  slot: false,
  hearAbout: false,
  message: false,
  status: false,
  notes: false,
  followUp: false,
  lastContact: false,
  created: false,
};

export default function EnquiriesPage() {
  const { alert, confirm } = useAdminDialog();
  const [list, setList] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<EnquiryStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"pdf" | "csv">("pdf");
  const [exportDateMode, setExportDateMode] = useState<"all" | "year" | "range">("all");
  const [exportYear, setExportYear] = useState("");
  const [exportDateFrom, setExportDateFrom] = useState("");
  const [exportDateTo, setExportDateTo] = useState("");
  const [exportStatus, setExportStatus] = useState("");
  const [exportColumns, setExportColumns] = useState<EnquiriesListExportColumns>({ ...ENQUIRIES_EXPORT_COLUMNS_DEFAULT });
  const [exportCounting, setExportCounting] = useState(false);
  const [exportingDownload, setExportingDownload] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [eventDateFrom, setEventDateFrom] = useState("");
  const [eventDateTo, setEventDateTo] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const p = new URLSearchParams();
    p.set("page", String(page));
    p.set("limit", String(limit));
    if (eventDateFrom && /^\d{4}-\d{2}-\d{2}$/.test(eventDateFrom)) p.set("event_date_from", eventDateFrom);
    if (eventDateTo && /^\d{4}-\d{2}-\d{2}$/.test(eventDateTo)) p.set("event_date_to", eventDateTo);
    adminFetch(`/api/admin/enquiries?${p}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.statusText))))
      .then((d) => {
        setList(d.rows ?? []);
        setTotalPages(d.totalPages ?? 1);
        setTotal(d.total ?? 0);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, limit, eventDateFrom, eventDateTo, retryKey]);

  const stats = useMemo(() => {
    const c = { new: 0, contacted: 0, quoted: 0, converted: 0, lost: 0 };
    for (const e of list) c[e.status]++;
    return { total, onPage: list.length, ...c };
  }, [list, total]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter((e) => {
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (!q) return true;
      return (
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        (e.phone || "").toLowerCase().includes(q) ||
        (e.function_type || "").toLowerCase().includes(q) ||
        (e.message || "").toLowerCase().includes(q)
      );
    });
  }, [list, query, statusFilter]);

  const enquiriesExportBody = useCallback(() => {
    const body: Record<string, unknown> = {
      date_mode: exportDateMode,
      columns: exportColumns,
    };
    if (exportDateMode === "year" && exportYear && /^\d{4}$/.test(exportYear)) body.year = exportYear;
    if (exportDateMode === "range") {
      body.event_date_from = exportDateFrom;
      body.event_date_to = exportDateTo;
    }
    if (exportStatus && STATUS_ORDER.includes(exportStatus as EnquiryStatus)) body.status = exportStatus;
    return body;
  }, [exportDateMode, exportYear, exportDateFrom, exportDateTo, exportStatus, exportColumns]);

  const runEnquiriesExport = async () => {
    if (exportDateMode === "year" && (!exportYear || !/^\d{4}$/.test(exportYear))) {
      await alert("Choose a year, or switch to “All enquiries” / “Date range”.", { title: "Year required" });
      return;
    }
    if (exportDateMode === "range" && (!exportDateFrom.trim() || !exportDateTo.trim())) {
      await alert("Enter both event date from and to.", { title: "Date range incomplete" });
      return;
    }
    const payload = enquiriesExportBody();
    setExportCounting(true);
    let n = 0;
    try {
      const countRes = await adminFetch("/api/admin/enquiries/export-count", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!countRes.ok) throw new Error(await countRes.text());
      const j = (await countRes.json()) as { count?: number };
      n = typeof j.count === "number" ? j.count : 0;
    } catch (e) {
      await alert(e instanceof Error ? e.message : "Could not check export");
      return;
    } finally {
      setExportCounting(false);
    }
    if (n === 0) {
      await alert("Nothing matches your filters. There’s nothing to export.", { title: "No enquiries to export" });
      return;
    }
    const ext = exportFormat.toUpperCase();
    const ok = await confirm(`Export ${n} enquir${n === 1 ? "y" : "ies"} as ${ext}?`, {
      title: "Confirm export",
      confirmLabel: `Export ${ext}`,
    });
    if (!ok) return;
    setExportingDownload(true);
    try {
      const url = exportFormat === "pdf" ? "/api/admin/enquiries/export-pdf" : "/api/admin/enquiries/export-csv";
      const res = await adminFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      const cd = res.headers.get("Content-Disposition");
      const m = cd?.match(/filename="([^"]+)"/);
      a.download = m?.[1] || `enquiries-export.${exportFormat === "pdf" ? "pdf" : "csv"}`;
      a.click();
      URL.revokeObjectURL(a.href);
      setExportOpen(false);
    } catch (e) {
      await alert(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExportingDownload(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-eq">
        <div className="admin-bk-skeleton-line admin-bk-skeleton-line--lg" />
        <div className="admin-bk-skeleton-grid" style={{ marginTop: "1rem" }}>
          <div className="admin-bk-skeleton-card" />
          <div className="admin-bk-skeleton-card" />
          <div className="admin-bk-skeleton-card" />
          <div className="admin-bk-skeleton-card" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-eq">
        <div className="admin-bk-error">
          <h1 className="admin-page-title">Enquiries</h1>
          <p className="admin-bk-error-msg">Couldn’t load enquiries.</p>
          <p className="admin-bk-error-detail">{error}</p>
          <button type="button" className="admin-btn admin-btn-primary" style={{ marginTop: "1rem" }} onClick={() => setRetryKey((k) => k + 1)}>
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-eq">
      <AdminCrmExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Export enquiries"
        titleId="enquiries-export-title"
        description="Filter by event date on the enquiry, status, and columns — then confirm to download."
        exportFormat={exportFormat}
        setExportFormat={setExportFormat}
        dateModes={[
          { mode: "all", label: "All enquiries" },
          { mode: "year", label: "By event year" },
          { mode: "range", label: "Event date range" },
        ]}
        exportDateMode={exportDateMode}
        setExportDateMode={(m) => {
          if (m === "all" || m === "year" || m === "range") setExportDateMode(m);
        }}
        exportYear={exportYear}
        setExportYear={setExportYear}
        exportDateFrom={exportDateFrom}
        setExportDateFrom={setExportDateFrom}
        exportDateTo={exportDateTo}
        setExportDateTo={setExportDateTo}
        statusSlot={
          <div className="admin-form-group">
            <label>Status</label>
            <select value={exportStatus} onChange={(e) => setExportStatus(e.target.value)} className="admin-table-select">
              <option value="">All statuses</option>
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        }
        columnLabels={ENQUIRIES_EXPORT_COLUMN_LABELS}
        columns={exportColumns as unknown as Record<string, boolean>}
        setColumns={setExportColumns as unknown as React.Dispatch<React.SetStateAction<Record<string, boolean>>>}
        onSelectAll={() => setExportColumns({ ...ENQUIRIES_EXPORT_COLUMNS_DEFAULT })}
        onClearAll={() => setExportColumns({ ...ENQ_COL_NONE })}
        exportCounting={exportCounting}
        exportingDownload={exportingDownload}
        onContinue={runEnquiriesExport}
      />

      <div className="admin-page-banner">
        <header className="admin-eq-hero">
        <div>
          <p className="admin-dash-kicker">CRM</p>
          <h1 className="admin-page-title admin-eq-title">Enquiries</h1>
          <p className="admin-lead admin-eq-lead">
            Leads from your site — filter, follow up, log notes, convert to a booking when they’re ready.
          </p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setExportOpen(true)}>
            Export PDF / CSV…
          </button>
          <Link href="/admin/bookings" className="admin-btn admin-btn-ghost">
            Bookings
          </Link>
        </div>
        </header>
      </div>

      <div className="admin-stats-unified-wrap">
        <AdminStatsCards
          ariaLabel="Enquiries summary"
          items={[
            { label: "Total", value: stats.total, hint: `Page ${page}/${totalPages}` },
            { label: "New", value: stats.new, variant: "accent" },
            { label: "In progress", value: stats.contacted + stats.quoted },
            { label: "Converted", value: stats.converted, variant: "ok" },
          ]}
        />
      </div>

      <section className="admin-crm-filters" aria-label="Enquiries filters">
        <div className="admin-crm-filters-row">
          <div className="admin-crm-filters-seg" role="group" aria-label="Status">
            <button
              type="button"
              className={statusFilter === "all" ? "admin-crm-filters-seg-btn admin-crm-filters-seg-btn--on" : "admin-crm-filters-seg-btn"}
              onClick={() => setStatusFilter("all")}
            >
              All
            </button>
            {STATUS_ORDER.map((s) => (
              <button
                key={s}
                type="button"
                className={statusFilter === s ? "admin-crm-filters-seg-btn admin-crm-filters-seg-btn--on" : "admin-crm-filters-seg-btn"}
                onClick={() => setStatusFilter(s)}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
        <div className="admin-crm-filters-dates">
          <label className="admin-crm-filters-date-label">
            <span>Event from</span>
            <input
              type="date"
              className="admin-crm-filters-date"
              value={eventDateFrom}
              onChange={(e) => {
                setPage(1);
                setEventDateFrom(e.target.value);
              }}
            />
          </label>
          <label className="admin-crm-filters-date-label">
            <span>Event to</span>
            <input
              type="date"
              className="admin-crm-filters-date"
              value={eventDateTo}
              onChange={(e) => {
                setPage(1);
                setEventDateTo(e.target.value);
              }}
            />
          </label>
          {eventDateFrom || eventDateTo ? (
            <button
              type="button"
              className="admin-btn admin-btn-ghost admin-btn-sm"
              style={{ height: "2.5rem", alignSelf: "flex-end" }}
              onClick={() => {
                setEventDateFrom("");
                setEventDateTo("");
                setPage(1);
              }}
            >
              Clear dates
            </button>
          ) : null}
          <input
            type="search"
            className="admin-crm-filters-search"
            style={{ alignSelf: "flex-end", maxWidth: "min(420px, 100%)" }}
            placeholder="Search name, email, message…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search enquiries"
          />
        </div>
      </section>

      {filtered.length === 0 ? (
        <div className="admin-bk-empty">
          <p className="admin-bk-empty-title">{list.length === 0 ? "No enquiries yet" : "No matches"}</p>
          <p className="admin-bk-empty-desc">{list.length === 0 ? "Submissions from your contact form will appear here." : "Try another filter or search."}</p>
        </div>
      ) : (
        <>
          <p className="admin-bk-count">
            Showing <strong>{filtered.length}</strong> on this page · {stats.total} total
          </p>
          <div className="admin-card admin-unified-layout">
            <div className="admin-pay-table-wrap">
              <table className="admin-pay-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Function</th>
                    <th>Event date</th>
                    <th>Slot</th>
                    <th>Hold</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e) => {
                    const hold = (e as Enquiry & {
                      active_hold?: { hold_date: string; expires_at: string | null; event_slot_key: string | null } | null;
                    }).active_hold;
                    return (
                    <tr key={e.id}>
                      <td>
                        <span className="admin-pay-client">{e.name}</span>
                      </td>
                      <td>
                        <a href={`mailto:${e.email}`} className="admin-link">{e.email}</a>
                      </td>
                      <td className="admin-table-phone">
                        {e.phone ? <a href={`tel:${e.phone}`}>{e.phone}</a> : "—"}
                      </td>
                      <td>{e.function_type || "—"}</td>
                      <td>{e.event_date ? new Date(e.event_date + "T12:00:00").toLocaleDateString("en-GB") : "—"}</td>
                      <td>
                        {e.event_slot_key === "whole_day"
                          ? "Full venue"
                          : e.event_slot_key
                            ? e.event_slot_key.replace(/_/g, " ")
                            : "—"}
                      </td>
                      <td>
                        {hold ? (
                          <span className="admin-badge admin-badge-hold" title={hold.expires_at ? `Until ${new Date(hold.expires_at).toLocaleString("en-GB")}` : "Soft hold"}>
                            On hold · {new Date(hold.hold_date + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                            {hold.event_slot_key ? ` · ${hold.event_slot_key.replace(/_/g, " ")}` : ""}
                          </span>
                        ) : (
                          <span className="admin-eq-hold-empty">—</span>
                        )}
                      </td>
                      <td onClick={(ev) => ev.stopPropagation()}>
                        <select
                          className="admin-eq-status-select"
                          aria-label={`Status for ${e.name}`}
                          disabled={statusUpdatingId === e.id}
                          value={e.status}
                          onChange={async (ev) => {
                            const next = ev.target.value as Enquiry["status"];
                            setStatusUpdatingId(e.id);
                            try {
                              const r = await adminFetch(`/api/admin/enquiries/${e.id}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ status: next }),
                              });
                              if (!r.ok) throw new Error(await r.text());
                              setList((prev) => prev.map((x) => (x.id === e.id ? { ...x, status: next } : x)));
                            } catch (err) {
                              await alert(err instanceof Error ? err.message : "Could not update status");
                              ev.target.value = e.status;
                            } finally {
                              setStatusUpdatingId(null);
                            }
                          }}
                        >
                          {STATUS_ORDER.map((s) => (
                            <option key={s} value={s}>
                              {STATUS_LABELS[s]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>{new Date(e.created_at).toLocaleDateString()}</td>
                      <td>
                        <Link href={`/admin/enquiries/${e.id}`} className="admin-btn admin-btn-sm admin-btn-primary">
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <nav className="admin-pay-pager" aria-label="Enquiry pages">
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
              <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }} aria-label="Items per page" className="admin-pay-pager-limit-select">
                {[10, 15, 20, 25].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              per page
            </label>
          </nav>
        </>
      )}
    </div>
  );
}
