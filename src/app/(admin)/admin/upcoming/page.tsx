"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-api-client";
import { AdminStatsCards } from "@/components/admin/AdminStatsCards";
import { useAdminDialog } from "@/components/admin/AdminDialogContext";
import { AdminCrmExportModal } from "@/components/admin/AdminCrmExportModal";
import {
  UPCOMING_EXPORT_COLUMNS_DEFAULT,
  UPCOMING_EXPORT_COLUMN_LABELS,
  type UpcomingListExportColumns,
} from "@/lib/upcoming-export-columns";

const STATUS_OPTIONS = ["pending", "confirmed", "cancelled", "completed"] as const;

type UpcomingRow = {
  id: string;
  client_name: string | null;
  client_email: string;
  client_phone?: string | null;
  event_date: string;
  status: string;
  event_type?: string | null;
  booking_code?: string | null;
  total_cents?: number | null;
  event_slot_label?: string;
};

function formatPounds(cents: number | null) {
  if (cents == null) return "—";
  return "£" + (cents / 100).toFixed(2);
}

const COL_NONE: UpcomingListExportColumns = {
  code: false,
  client: false,
  phone: false,
  eventDate: false,
  slot: false,
  eventType: false,
  package: false,
  total: false,
  status: false,
};

export default function UpcomingBookingsPage() {
  const { alert, confirm } = useAdminDialog();
  const [rows, setRows] = useState<UpcomingRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"pdf" | "csv">("pdf");
  const [exportDateMode, setExportDateMode] = useState<"from_today" | "year" | "range">("from_today");
  const [exportYear, setExportYear] = useState(String(new Date().getFullYear()));
  const [exportDateFrom, setExportDateFrom] = useState("");
  const [exportDateTo, setExportDateTo] = useState("");
  const [exportStatus, setExportStatus] = useState("");
  const [exportColumns, setExportColumns] = useState<UpcomingListExportColumns>({ ...UPCOMING_EXPORT_COLUMNS_DEFAULT });
  const [exportCounting, setExportCounting] = useState(false);
  const [exportingDownload, setExportingDownload] = useState(false);

  const load = useCallback(() => {
    adminFetch(`/api/admin/sidebar-upcoming?page=${page}&limit=25`)
      .then((r) => (r.ok ? r.json() : { rows: [], totalPages: 1 }))
      .then((d) => {
        setRows(d.rows || []);
        setTotalPages(d.totalPages ?? 1);
      })
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (bookingId: string, status: string) => {
    const res = await adminFetch(`/api/admin/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) await alert(await res.text().catch(() => "Failed"));
    else {
      if (status === "completed" || status === "cancelled") {
        setRows((prev) => prev.filter((r) => r.id !== bookingId));
      } else {
        setRows((prev) => prev.map((r) => (r.id === bookingId ? { ...r, status } : r)));
      }
    }
  };

  const confirmed = rows.filter((r) => r.status === "confirmed").length;
  const pending = rows.filter((r) => r.status === "pending").length;

  const upcomingExportBody = useMemo(() => {
    const base: Record<string, unknown> = {
      date_mode: exportDateMode,
      columns: exportColumns,
    };
    if (exportDateMode === "year" && exportYear) base.year = exportYear;
    if (exportDateMode === "range") {
      base.event_date_from = exportDateFrom;
      base.event_date_to = exportDateTo;
    }
    if (exportStatus && STATUS_OPTIONS.includes(exportStatus as (typeof STATUS_OPTIONS)[number])) {
      base.status = exportStatus;
    }
    return base;
  }, [exportDateMode, exportYear, exportDateFrom, exportDateTo, exportStatus, exportColumns]);

  const runExportContinue = async () => {
    if (exportDateMode === "year" && (!exportYear || !/^\d{4}$/.test(exportYear))) {
      await alert("Choose a year for the export.", { title: "Year required" });
      return;
    }
    if (exportDateMode === "range" && (!exportDateFrom.trim() || !exportDateTo.trim())) {
      await alert("Enter both start and end dates.", { title: "Date range incomplete" });
      return;
    }
    setExportCounting(true);
    let n = 0;
    try {
      const countRes = await adminFetch("/api/admin/upcoming/export-count", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(upcomingExportBody),
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
      await alert("Nothing matches your filters. There’s nothing to export.", { title: "No rows to export" });
      return;
    }
    const ext = exportFormat.toUpperCase();
    const ok = await confirm(`Export ${n} booking${n === 1 ? "" : "s"} as ${ext}?`, {
      title: "Confirm export",
      confirmLabel: `Export ${ext}`,
    });
    if (!ok) return;
    setExportingDownload(true);
    try {
      const url = exportFormat === "pdf" ? "/api/admin/upcoming/export-pdf" : "/api/admin/upcoming/export-csv";
      const res = await adminFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(upcomingExportBody),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      const cd = res.headers.get("Content-Disposition");
      const m = cd?.match(/filename="([^"]+)"/);
      a.download = m?.[1] || `upcoming-export.${exportFormat === "pdf" ? "pdf" : "csv"}`;
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
      <div className="admin-bk">
        <div className="admin-bk-skeleton-line admin-bk-skeleton-line--lg" />
        <div className="admin-bk-skeleton-grid" style={{ marginTop: "1rem" }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="admin-bk-skeleton-card" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-bk">
      <AdminCrmExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Export upcoming bookings"
        titleId="upcoming-export-title"
        description="Future events only. Pick date scope, status, columns — then confirm to download."
        exportFormat={exportFormat}
        setExportFormat={setExportFormat}
        dateModes={[
          { mode: "from_today", label: "From today" },
          { mode: "year", label: "By year" },
          { mode: "range", label: "Date range" },
        ]}
        exportDateMode={exportDateMode}
        setExportDateMode={(m) => {
          if (m === "from_today" || m === "year" || m === "range") setExportDateMode(m);
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
              <option value="">Pending + confirmed (default)</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        }
        columnLabels={UPCOMING_EXPORT_COLUMN_LABELS}
        columns={exportColumns}
        setColumns={setExportColumns as unknown as React.Dispatch<React.SetStateAction<Record<string, boolean>>>}
        onSelectAll={() => setExportColumns({ ...UPCOMING_EXPORT_COLUMNS_DEFAULT })}
        onClearAll={() => setExportColumns({ ...COL_NONE })}
        exportCounting={exportCounting}
        exportingDownload={exportingDownload}
        onContinue={runExportContinue}
      />

      <div className="admin-page-banner">
        <header className="admin-bk-hero">
          <div className="admin-bk-hero-text">
            <p className="admin-dash-kicker">Events & sales</p>
            <h1 className="admin-page-title admin-bk-title">Upcoming bookings</h1>
            <p className="admin-lead admin-bk-lead">
              Next events by date. Click a row to open the full booking. Completed and cancelled bookings disappear from this list.
            </p>
          </div>
          <div className="admin-bk-hero-actions">
            <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setExportOpen(true)}>
              Export PDF / CSV…
            </button>
            <Link href="/admin/bookings" className="admin-btn admin-btn-ghost">
              Bookings
            </Link>
            <Link href="/admin/bookings/new" className="admin-btn admin-btn-primary">
              + New booking
            </Link>
          </div>
        </header>
      </div>

      <div className="admin-stats-unified-wrap">
        <AdminStatsCards
          ariaLabel="Upcoming summary"
          items={[
            { label: "Upcoming", value: rows.length, hint: "Future events" },
            { label: "Confirmed", value: confirmed, variant: "ok" },
            { label: "Pending", value: pending, variant: "accent" },
            { label: "Next 8", value: rows.slice(0, 8).length, hint: "Shown below" },
          ]}
        />
      </div>

      {rows.length === 0 ? (
        <div className="admin-bk-empty">
          <p className="admin-bk-empty-title">No upcoming bookings</p>
          <p className="admin-bk-empty-desc">Create a booking with an event date in the future to see it here.</p>
          <Link href="/admin/bookings/new" className="admin-btn admin-btn-primary">
            New booking
          </Link>
        </div>
      ) : (
        <>
          <div className="admin-card admin-unified-layout">
            <div className="admin-pay-table-wrap">
              <table className="admin-pay-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Slot</th>
                    <th>Code</th>
                    <th>Client</th>
                    <th>Phone</th>
                    <th>Type</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td>{new Date(r.event_date + "T12:00:00").toLocaleDateString("en-GB", { dateStyle: "medium" })}</td>
                      <td className="admin-pay-muted" style={{ fontSize: "0.8125rem", maxWidth: "10rem" }}>
                        {r.event_slot_label || "—"}
                      </td>
                      <td>
                        <code className="admin-bk-code">{r.booking_code || "—"}</code>
                      </td>
                      <td>
                        <span className="admin-pay-client">{r.client_name || r.client_email}</span>
                        {r.client_name ? <span className="admin-pay-sub">{r.client_email}</span> : null}
                      </td>
                      <td className="admin-table-phone">
                        {r.client_phone ? <a href={`tel:${r.client_phone}`}>{r.client_phone}</a> : "—"}
                      </td>
                      <td>{r.event_type || "—"}</td>
                      <td className="admin-pay-amt">{formatPounds(r.total_cents ?? null)}</td>
                      <td>
                        <select
                          className="admin-table-select"
                          value={r.status}
                          onChange={(e) => setStatus(r.id, e.target.value)}
                          aria-label="Change status"
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <Link href={`/admin/bookings/${r.id}`} className="admin-btn admin-btn-sm admin-btn-primary">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <nav className="admin-pay-pager" aria-label="Upcoming booking pages">
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
