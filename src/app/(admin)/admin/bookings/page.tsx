"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { adminFetch, parseAdminError } from "@/lib/admin-api-client";
import Link from "next/link";
import type { Booking, BookingStatus } from "@/types/crm";
import { AdminStatsCards } from "@/components/admin/AdminStatsCards";
import { AdminDateFilter, getDateRangeFromValue, useDateFilterState } from "@/components/admin/AdminDateFilter";
import { useAdminDialog } from "@/components/admin/AdminDialogContext";
import { MoneyInput } from "@/components/admin/MoneyInput";
import {
  BOOKING_COMPLETED_FUTURE_EVENT_MESSAGE,
  isEventDateInFutureLondon,
} from "@/lib/booking-status-rules";
import { bookingMoneyFromLedger } from "@/lib/booking-money-summary";
import {
  BOOKINGS_EXPORT_COLUMNS_DEFAULT,
  BOOKINGS_EXPORT_COLUMN_LABELS,
  type BookingsListExportColumns,
} from "@/lib/bookings-export-columns";

const EXPORT_COLUMNS_NONE: BookingsListExportColumns = {
  code: false,
  client: false,
  phone: false,
  eventDate: false,
  eventType: false,
  package: false,
  total: false,
  deposit: false,
  status: false,
};

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  completed: "Completed",
};

type BookingRow = Booking & { paid_cents?: number; due_cents?: number | null };

const STATUS_ORDER: BookingStatus[] = ["pending", "confirmed", "completed", "cancelled"];

type ExportDateMode = "all" | "year" | "range";

function buildExportDateFilters(mode: ExportDateMode, year: string, from: string, to: string) {
  if (mode === "year" && year && /^\d{4}$/.test(year)) return { year } as const;
  if (mode === "range" && from && to && /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return from <= to
      ? ({ event_date_from: from, event_date_to: to } as const)
      : ({ event_date_from: to, event_date_to: from } as const);
  }
  return {} as const;
}

function exportFileSlug(mode: ExportDateMode, year: string, from: string, to: string) {
  if (mode === "year" && year) return year;
  if (mode === "range" && from && to) {
    const a = from <= to ? from : to;
    const b = from <= to ? to : from;
    return `${a}-to-${b}`;
  }
  return "all-dates";
}

export default function BookingsPage() {
  const { alert, confirm } = useAdminDialog();
  const searchParams = useSearchParams();
  const [list, setList] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [listRefreshing, setListRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [softError, setSoftError] = useState<string | null>(null);
  const hydratedRef = useRef(false);
  const [retryKey, setRetryKey] = useState(0);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all");
  const [dateFilter, setDateFilter] = useDateFilterState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalBookings, setTotalBookings] = useState(0);
  const [summary, setSummary] = useState({ pending: 0, confirmed: 0, upcomingThisMonth: 0 });
  const [exportOpen, setExportOpen] = useState(false);
  const [exportDateMode, setExportDateMode] = useState<ExportDateMode>("year");
  const [exportYear, setExportYear] = useState("");
  const [exportDateFrom, setExportDateFrom] = useState("");
  const [exportDateTo, setExportDateTo] = useState("");
  const [exportStatus, setExportStatus] = useState("");
  const [exportColumns, setExportColumns] = useState<BookingsListExportColumns>({
    ...BOOKINGS_EXPORT_COLUMNS_DEFAULT,
  });
  const [exportFormat, setExportFormat] = useState<"pdf" | "csv">("pdf");
  const [exportingDownload, setExportingDownload] = useState(false);
  const [exportCounting, setExportCounting] = useState(false);
  const [debouncedQ, setDebouncedQ] = useState("");
  const [moneySavingId, setMoneySavingId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const urlQ = searchParams.get("q");
    if (urlQ && urlQ.trim()) setQuery(urlQ.trim());
  }, [searchParams]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQ(query.trim()), 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const setBookingStatus = async (
    bookingId: string,
    status: BookingStatus,
    eventDate: string | null | undefined,
  ) => {
    if (status === "completed" && isEventDateInFutureLondon(eventDate)) {
      await alert(BOOKING_COMPLETED_FUTURE_EVENT_MESSAGE, { title: "Can’t mark as completed yet" });
      return;
    }
    const res = await adminFetch(`/api/admin/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      await alert(await parseAdminError(res, "Couldn’t update booking status"));
      return;
    }
    setList((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status } : b)));
  };

  const patchRowMoney = (bookingId: string, patch: Partial<BookingRow>) => {
    setList((prev) =>
      prev.map((b) => {
        if (b.id !== bookingId) return b;
        const next = { ...b, ...patch };
        const paid = next.paid_cents ?? 0;
        const { stillDueCents } = bookingMoneyFromLedger(next.total_cents, paid);
        next.due_cents = next.total_cents != null ? stillDueCents : null;
        return next;
      }),
    );
  };

  const saveTotalCents = async (bookingId: string, total_cents: number) => {
    setMoneySavingId(bookingId);
    try {
      const res = await adminFetch(`/api/admin/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ total_cents }),
      });
      if (!res.ok) throw new Error(await parseAdminError(res, "Couldn’t update total"));
      const data = (await res.json()) as { total_cents?: number | null; paid_cents?: number; due_cents?: number | null };
      patchRowMoney(bookingId, {
        total_cents: data.total_cents ?? total_cents,
        paid_cents: data.paid_cents,
        due_cents: data.due_cents,
      });
    } catch (e) {
      await alert(e instanceof Error ? e.message : "Couldn’t update total");
    } finally {
      setMoneySavingId(null);
    }
  };

  const savePaidCents = async (bookingId: string, paid_cents: number) => {
    setMoneySavingId(bookingId);
    try {
      const res = await adminFetch(`/api/admin/bookings/${bookingId}/set-paid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paid_cents }),
      });
      if (!res.ok) throw new Error(await parseAdminError(res, "Couldn’t update paid amount"));
      const data = (await res.json()) as { paid_cents?: number; due_cents?: number | null; total_cents?: number | null };
      patchRowMoney(bookingId, {
        paid_cents: data.paid_cents ?? paid_cents,
        due_cents: data.due_cents,
        total_cents: data.total_cents,
      });
    } catch (e) {
      await alert(e instanceof Error ? e.message : "Couldn’t update paid amount");
    } finally {
      setMoneySavingId(null);
    }
  };

  const saveDueCents = async (booking: BookingRow, due_cents: number) => {
    const total = booking.total_cents ?? 0;
    const paid = Math.max(0, total - Math.max(0, due_cents));
    await savePaidCents(booking.id, paid);
  };

  const dateKey = `${dateFilter.preset}-${dateFilter.from}-${dateFilter.to}`;
  const filterRef = useRef({ q: debouncedQ, status: statusFilter, date: dateKey });
  useEffect(() => {
    if (hydratedRef.current) {
      setListRefreshing(true);
      setSoftError(null);
    } else {
      setLoading(true);
      setError(null);
    }
    const status = statusFilter === "all" ? "" : statusFilter;
    const { from: eventDateFrom, to: eventDateTo } = getDateRangeFromValue(dateFilter);
    const reset =
      filterRef.current.q !== debouncedQ ||
      filterRef.current.status !== statusFilter ||
      filterRef.current.date !== dateKey;
    filterRef.current = { q: debouncedQ, status: statusFilter, date: dateKey };
    const pageToUse = reset ? 1 : page;
    if (reset && page !== 1) setPage(1);
    const params = new URLSearchParams({ page: String(pageToUse), limit: String(limit) });
    if (status) params.set("status", status);
    if (eventDateFrom) params.set("event_date_from", eventDateFrom);
    if (eventDateTo) params.set("event_date_to", eventDateTo);
    if (debouncedQ.length >= 2) params.set("q", debouncedQ);
    adminFetch(`/api/admin/bookings?${params}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.statusText))))
      .then((d) => {
        setList(d.rows || d || []);
        setTotalPages(d.totalPages ?? 1);
        setTotalBookings(d.total ?? 0);
        if (d.summary) setSummary(d.summary);
        hydratedRef.current = true;
        setError(null);
        setSoftError(null);
      })
      .catch((e) => {
        const msg = e instanceof Error ? e.message : "Failed to load";
        if (hydratedRef.current) setSoftError(msg);
        else setError(msg);
      })
      .finally(() => {
        setLoading(false);
        setListRefreshing(false);
      });
  }, [page, limit, statusFilter, dateFilter, debouncedQ, retryKey]);

  if (loading && !hydratedRef.current) {
    return (
      <div className="admin-bk">
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

  if (error && !hydratedRef.current) {
    return (
      <div className="admin-bk">
        <div className="admin-bk-error">
          <h1 className="admin-page-title">Bookings</h1>
          <p className="admin-bk-error-msg">Couldn’t load bookings. Check you’re signed in and try again.</p>
          <p className="admin-bk-error-detail">{error}</p>
          <button type="button" className="admin-btn admin-btn-primary" style={{ marginTop: "1rem" }} onClick={() => setRetryKey((k) => k + 1)}>
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-bk">
      <div className="admin-page-banner">
        <header className="admin-bk-hero">
          <div className="admin-bk-hero-text">
            <p className="admin-dash-kicker">Venue</p>
            <h1 className="admin-page-title admin-bk-title">Bookings</h1>
            <p className="admin-lead admin-bk-lead">
              Find a booking, open it, record payments, or create a new one.
            </p>
          </div>
          <div className="admin-bk-hero-actions">
            <Link href="/admin/bookings/new" className="admin-btn admin-btn-primary admin-bk-new-btn">
              + New booking
            </Link>
            <details className="admin-bk-more-actions">
              <summary className="admin-btn admin-btn-ghost">More</summary>
              <div className="admin-bk-more-actions-menu">
                <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setExportOpen(true)}>
                  Export list
                </button>
                <Link href="/admin/calendar" className="admin-btn admin-btn-ghost">
                  Calendar
                </Link>
              </div>
            </details>
          </div>
        </header>
      </div>

      {exportOpen && (
        <div
          className="admin-bko-export-backdrop admin-bko-export-backdrop--wide"
          role="dialog"
          aria-modal
          aria-labelledby="bookings-export-title"
        >
          <div className="admin-bko-export-modal admin-bko-export-modal--wide admin-rem-modal">
            <div className="admin-bko-export-head">
              <h2 id="bookings-export-title">Export bookings</h2>
              <button type="button" className="admin-inv-modal-x" onClick={() => setExportOpen(false)} aria-label="Close">
                ×
              </button>
            </div>
            <p className="admin-bko-export-desc">Pick format, date scope, status, and columns — then confirm to download.</p>
            <div className="admin-bko-export-format" role="group" aria-label="Export format">
              <button
                type="button"
                className={`admin-bko-export-format-btn${exportFormat === "pdf" ? " admin-bko-export-format-btn--active" : ""}`}
                onClick={() => setExportFormat("pdf")}
              >
                PDF
              </button>
              <button
                type="button"
                className={`admin-bko-export-format-btn${exportFormat === "csv" ? " admin-bko-export-format-btn--active" : ""}`}
                onClick={() => setExportFormat("csv")}
              >
                CSV
              </button>
            </div>
            <div className="admin-bko-export-date-modes" role="group" aria-label="Date scope">
              {(["all", "year", "range"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`admin-bko-export-date-mode${exportDateMode === m ? " admin-bko-export-date-mode--on" : ""}`}
                  onClick={() => setExportDateMode(m)}
                >
                  {m === "all" ? "All dates" : m === "year" ? "By year" : "Date range"}
                </button>
              ))}
            </div>
            <div className="admin-form-grid admin-bko-export-filters-grid" style={{ marginBottom: "1rem" }}>
              {exportDateMode === "year" ? (
                <div className="admin-form-group">
                  <label>Year</label>
                  <select value={exportYear} onChange={(e) => setExportYear(e.target.value)} className="admin-table-select">
                    <option value="">All years</option>
                    {[new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2].map((y) => (
                      <option key={y} value={String(y)}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              {exportDateMode === "range" ? (
                <>
                  <div className="admin-form-group">
                    <label>From</label>
                    <input
                      type="date"
                      className="admin-table-select"
                      style={{ width: "100%" }}
                      value={exportDateFrom}
                      onChange={(e) => setExportDateFrom(e.target.value)}
                    />
                  </div>
                  <div className="admin-form-group">
                    <label>To</label>
                    <input
                      type="date"
                      className="admin-table-select"
                      style={{ width: "100%" }}
                      value={exportDateTo}
                      onChange={(e) => setExportDateTo(e.target.value)}
                    />
                  </div>
                </>
              ) : null}
              <div className="admin-form-group">
                <label>Status (optional)</label>
                <select value={exportStatus} onChange={(e) => setExportStatus(e.target.value)} className="admin-table-select">
                  <option value="">All statuses</option>
                  {STATUS_ORDER.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="admin-bko-export-desc" style={{ marginBottom: "0.5rem" }}>Include in export:</p>
            <div className="admin-bko-export-actions-bar" style={{ marginBottom: "0.5rem" }}>
              <button
                type="button"
                className="admin-btn admin-btn-ghost admin-btn-sm"
                onClick={() => setExportColumns({ ...BOOKINGS_EXPORT_COLUMNS_DEFAULT })}
              >
                Select all
              </button>
              <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setExportColumns({ ...EXPORT_COLUMNS_NONE })}>
                Clear all
              </button>
            </div>
            <ul className="admin-bko-export-list">
              {BOOKINGS_EXPORT_COLUMN_LABELS.map(({ key, label }) => (
                <li key={key}>
                  <label className="admin-bko-export-item">
                    <input type="checkbox" checked={exportColumns[key]} onChange={(e) => setExportColumns((s) => ({ ...s, [key]: e.target.checked }))} />
                    <span className="admin-bko-export-label">{label}</span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="admin-inv-modal-actions">
              <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setExportOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                disabled={exportingDownload || exportCounting}
                onClick={async () => {
                  if (exportDateMode === "range" && (!exportDateFrom.trim() || !exportDateTo.trim())) {
                    await alert("Enter both start and end dates for a custom range, or choose another date option.", {
                      title: "Date range incomplete",
                    });
                    return;
                  }
                  const dateFilters = buildExportDateFilters(exportDateMode, exportYear, exportDateFrom, exportDateTo);
                  const statusPayload = exportStatus || undefined;
                  const countPayload = { ...dateFilters, status: statusPayload };
                  setExportCounting(true);
                  let n = 0;
                  try {
                    const countRes = await adminFetch("/api/admin/bookings/export-count", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(countPayload),
                    });
                    if (!countRes.ok) throw new Error(await countRes.text());
                    const countJson = (await countRes.json()) as { count?: number };
                    n = typeof countJson.count === "number" ? countJson.count : 0;
                  } catch (e) {
                    await alert(e instanceof Error ? e.message : "Could not check export");
                    return;
                  } finally {
                    setExportCounting(false);
                  }
                  if (n === 0) {
                    await alert("Nothing matches your filters. There’s nothing to export.", { title: "No bookings to export" });
                    return;
                  }
                  const ext = exportFormat.toUpperCase();
                  const ok = await confirm(
                    `Export ${n} booking${n === 1 ? "" : "s"} as ${ext}?`,
                    { title: "Confirm export", confirmLabel: `Export ${ext}` },
                  );
                  if (!ok) return;
                  const slug = exportFileSlug(exportDateMode, exportYear, exportDateFrom, exportDateTo);
                  const exportBody = {
                    ...dateFilters,
                    status: statusPayload,
                    columns: exportColumns,
                  };
                  setExportingDownload(true);
                  try {
                    if (exportFormat === "pdf") {
                      const res = await adminFetch("/api/admin/bookings/export-list-pdf", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(exportBody),
                      });
                      if (!res.ok) throw new Error(await parseAdminError(res, "Export failed"));
                      const blob = await res.blob();
                      const a = document.createElement("a");
                      a.href = URL.createObjectURL(blob);
                      a.download = `bookings-export-${slug}.pdf`;
                      a.click();
                      URL.revokeObjectURL(a.href);
                    } else {
                      const res = await adminFetch("/api/admin/bookings/export-csv", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(exportBody),
                      });
                      if (!res.ok) throw new Error(await parseAdminError(res, "Export failed"));
                      const blob = await res.blob();
                      const a = document.createElement("a");
                      a.href = URL.createObjectURL(blob);
                      a.download = `bookings-export-${slug}.csv`;
                      a.click();
                      URL.revokeObjectURL(a.href);
                    }
                    setExportOpen(false);
                  } catch (e) {
                    await alert(e instanceof Error ? e.message : "Export failed");
                  } finally {
                    setExportingDownload(false);
                  }
                }}
              >
                {exportCounting
                  ? "Checking…"
                  : exportingDownload
                    ? exportFormat === "pdf"
                      ? "Generating PDF…"
                      : "Exporting CSV…"
                    : "Continue…"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="admin-stats-unified-wrap">
        <AdminStatsCards
          ariaLabel="Booking summary"
          items={[
            { label: "Bookings", value: totalBookings, hint: statusFilter === "all" ? "All" : STATUS_LABELS[statusFilter] },
            { label: "This month", value: summary.upcomingThisMonth, hint: "Upcoming events", variant: "gold" },
          ]}
        />
      </div>

      {softError ? (
        <div className="admin-bk-soft-error" role="alert">
          <span>Couldn’t refresh list: {softError}</span>
          <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setRetryKey((k) => k + 1)}>
            Retry
          </button>
        </div>
      ) : null}

      <section className="admin-crm-filters admin-crm-filters--bookings" aria-label="Bookings filters">
        {listRefreshing ? (
          <p className="admin-bk-refresh-hint" aria-live="polite">
            Updating list…
          </p>
        ) : null}
        <div className="admin-crm-filters-dates admin-crm-filters-dates--bookings">
          <div className="admin-bk-filter-status-block">
            <span className="admin-date-filter-label" id="bk-status-filter-label">
              Status
            </span>
            <div
              className="admin-date-filter-presets"
              role="group"
              aria-labelledby="bk-status-filter-label"
            >
              <button
                type="button"
                className={statusFilter === "all" ? "admin-date-filter-btn admin-date-filter-btn--on" : "admin-date-filter-btn"}
                aria-pressed={statusFilter === "all"}
                onClick={() => {
                  setStatusFilter("all");
                  setPage(1);
                }}
              >
                All
              </button>
              {STATUS_ORDER.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={statusFilter === s ? "admin-date-filter-btn admin-date-filter-btn--on" : "admin-date-filter-btn"}
                  aria-pressed={statusFilter === s}
                  onClick={() => {
                    setStatusFilter(s);
                    setPage(1);
                  }}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
          <AdminDateFilter
            value={dateFilter}
            onChange={(v) => {
              setDateFilter(v);
              setPage(1);
            }}
            id="bk-date-filter"
            label="Date"
          />
          <label className="admin-crm-filters-date-label admin-bk-filters-search-label">
            <span>Search</span>
            <input
              id="bk-search"
              type="search"
              className="admin-crm-filters-search admin-bk-filters-search-input"
              placeholder="Name, email, package…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>
      </section>

      {list.length === 0 ? (
        <div className="admin-bk-empty">
          <p className="admin-bk-empty-title">{totalBookings === 0 ? "No bookings yet" : "No matches on this page"}</p>
          <p className="admin-bk-empty-desc">
            {list.length === 0
              ? "Create your first booking to hold a date and track deposits."
              : "Try another search or status filter."}
          </p>
          {list.length === 0 && (
            <Link href="/admin/bookings/new" className="admin-btn admin-btn-primary">
              Create booking
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className={`admin-card admin-unified-layout admin-bk-table-simple admin-bk-table-money${listRefreshing ? " admin-bk-table-card--refreshing" : ""}`}>
            <div className="admin-pay-table-wrap">
              <table className="admin-pay-table admin-pay-table--simple admin-pay-table--money-lg">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Event date</th>
                    <th>Total</th>
                    <th>Paid</th>
                    <th>Still due</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <span className="admin-pay-client">{b.client_name || "—"}</span>
                        <span className="admin-pay-sub">{b.client_email}</span>
                        {b.client_phone ? <span className="admin-pay-sub">{b.client_phone}</span> : null}
                      </td>
                      <td>{new Date(b.event_date + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</td>
                      <td className="admin-pay-amt">
                        <MoneyInput
                          className="admin-table-inline-input admin-bk-money-input"
                          cents={b.total_cents ?? 0}
                          onCentsChange={(cents) => void saveTotalCents(b.id, cents)}
                          aria-label={`Total for ${b.client_name || b.client_email}`}
                          disabled={moneySavingId === b.id}
                        />
                      </td>
                      <td className="admin-pay-amt admin-pay-amt--ok">
                        <MoneyInput
                          className="admin-table-inline-input admin-bk-money-input admin-bk-money-input--paid"
                          cents={b.paid_cents ?? 0}
                          onCentsChange={(cents) => void savePaidCents(b.id, cents)}
                          aria-label={`Paid for ${b.client_name || b.client_email}`}
                          disabled={moneySavingId === b.id}
                        />
                      </td>
                      <td className={`admin-pay-amt${(b.due_cents ?? 0) > 0 ? " admin-pay-amt--due" : ""}`}>
                        <MoneyInput
                          className="admin-table-inline-input admin-bk-money-input admin-bk-money-input--due"
                          cents={b.due_cents ?? 0}
                          onCentsChange={(cents) => void saveDueCents(b, cents)}
                          aria-label={`Still due for ${b.client_name || b.client_email}`}
                          disabled={moneySavingId === b.id || b.total_cents == null}
                        />
                      </td>
                      <td>
                        <select
                          className="admin-table-select"
                          value={b.status}
                          onChange={(e) =>
                            setBookingStatus(b.id, e.target.value as BookingStatus, b.event_date)
                          }
                          aria-label="Change status"
                        >
                          {STATUS_ORDER.map((s) => (
                            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <Link href={`/admin/bookings/${b.id}`} className="admin-btn admin-btn-sm admin-btn-primary">
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <nav className="admin-pay-pager" aria-label="Booking pages">
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
