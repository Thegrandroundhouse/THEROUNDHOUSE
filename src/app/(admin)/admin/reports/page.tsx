"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { adminFetch } from "@/lib/admin-api-client";
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { AdminStatsCards } from "@/components/admin/AdminStatsCards";

type SeriesRow = { month: string; label: string; revenuePence: number; bookings: number };

type EnquiryVolRow = { month: string; label: string; count: number };

type Summary = {
  bookingsTotal: number;
  bookingsInFilter?: number;
  enquiriesTotal: number;
  enquiriesByStatus: Record<string, number>;
  leadConversionRate: number;
  revenueByMonth: Record<string, number>;
  totalRevenuePence?: number;
  series?: SeriesRow[];
  bookingsByStatusInFilter?: Record<string, number>;
  enquiriesVolumeSeries?: EnquiryVolRow[];
  filtersApplied?: { dateFrom: string | null; dateTo: string | null; statuses: string[] };
};

const GBP = (pence: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(
    pence / 100,
  );

/** Short axis labels to avoid overlap (e.g. £90k, £1.2m) */
function axisGBP(pence: number): string {
  const n = pence / 100;
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `£${(n / 1_000).toFixed(0)}k`;
  return `£${Math.round(n)}`;
}

const STATUS_ORDER = ["new", "contacted", "quoted", "converted", "lost"] as const;
const STATUS_COLORS: Record<string, string> = {
  new: "#3b82f6",
  contacted: "#d97706",
  quoted: "#6366f1",
  converted: "#059669",
  lost: "#dc2626",
};
const STATUS_LABEL: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  quoted: "Quoted",
  converted: "Converted",
  lost: "Lost",
};

const BK_STATUSES = ["pending", "confirmed", "completed", "cancelled"] as const;

const BK_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};
const BK_STATUS_COLORS: Record<string, string> = {
  pending: "#d97706",
  confirmed: "#2563eb",
  completed: "#059669",
  cancelled: "#64748b",
};

function localYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type ReportsDatePresetId =
  | "7d"
  | "30d"
  | "this_month"
  | "last_month"
  | "this_year"
  | "last_year"
  | "all";

const REPORT_DATE_PRESETS: { id: ReportsDatePresetId; label: string }[] = [
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "this_month", label: "This month" },
  { id: "last_month", label: "Last month" },
  { id: "this_year", label: "This year" },
  { id: "last_year", label: "Last year" },
  { id: "all", label: "All time" },
];

function getPresetRange(id: ReportsDatePresetId): { from: string; to: string } {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (id === "all") return { from: "", to: "" };
  if (id === "7d") {
    const s = new Date(startOfToday);
    s.setDate(s.getDate() - 6);
    return { from: localYMD(s), to: localYMD(startOfToday) };
  }
  if (id === "30d") {
    const s = new Date(startOfToday);
    s.setDate(s.getDate() - 29);
    return { from: localYMD(s), to: localYMD(startOfToday) };
  }
  if (id === "this_month") {
    const s = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: localYMD(s), to: localYMD(startOfToday) };
  }
  if (id === "last_month") {
    const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const last = new Date(today.getFullYear(), today.getMonth(), 0);
    return { from: localYMD(first), to: localYMD(last) };
  }
  if (id === "this_year") {
    const s = new Date(today.getFullYear(), 0, 1);
    return { from: localYMD(s), to: localYMD(startOfToday) };
  }
  if (id === "last_year") {
    const y = today.getFullYear() - 1;
    return { from: `${y}-01-01`, to: `${y}-12-31` };
  }
  return { from: "", to: "" };
}

export default function ReportsPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [at, setAt] = useState<Date | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [datePreset, setDatePreset] = useState<ReportsDatePresetId | "custom">("all");
  const [statuses, setStatuses] = useState<string[]>(["pending", "confirmed", "completed"]);

  const fetchSummary = useCallback(
    (opts?: { dateFrom?: string; dateTo?: string; statuses?: string[] }) => {
      const df = opts?.dateFrom !== undefined ? opts.dateFrom : dateFrom;
      const dt = opts?.dateTo !== undefined ? opts.dateTo : dateTo;
      const st = opts?.statuses ?? statuses;
      const sp = new URLSearchParams();
      if (df) sp.set("date_from", df);
      if (dt) sp.set("date_to", dt);
      if (st.length) sp.set("statuses", st.join(","));
      adminFetch(`/api/admin/reports/summary?${sp}`)
        .then((r) => {
          if (!r.ok) throw new Error(r.status === 401 ? "Sign in again" : "Could not load reports");
          return r.json();
        })
        .then((j) => {
          setData(j);
          setAt(new Date());
        })
        .catch((e) => setErr(e instanceof Error ? e.message : "Error"));
    },
    [dateFrom, dateTo, statuses],
  );

  useEffect(() => {
    fetchSummary({ dateFrom: "", dateTo: "", statuses: ["pending", "confirmed", "completed"] });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only
  }, []);

  const applyDatePreset = (id: ReportsDatePresetId) => {
    const { from, to } = getPresetRange(id);
    setDateFrom(from);
    setDateTo(to);
    setDatePreset(id);
    fetchSummary({ dateFrom: from, dateTo: to });
  };

  const pieData = useMemo(() => {
    if (!data?.enquiriesByStatus) return [];
    const entries = Object.entries(data.enquiriesByStatus);
    const ordered = [
      ...STATUS_ORDER.filter((s) => entries.find(([k]) => k === s)).map((s) => [s, data.enquiriesByStatus[s]!] as const),
      ...entries.filter(([k]) => !STATUS_ORDER.includes(k as (typeof STATUS_ORDER)[number])),
    ];
    return ordered.map(([status, value]) => ({
      name: STATUS_LABEL[status] || status.replace(/_/g, " "),
      value,
      status,
    }));
  }, [data]);

  const series = data?.series?.length ? data.series : [];
  const totalRev = data?.totalRevenuePence ?? Object.values(data?.revenueByMonth ?? {}).reduce((a, b) => a + b, 0);
  const inFilter = data?.bookingsInFilter ?? 0;

  const revenuePerBooking = useMemo(() => series.map((s) => ({ ...s, avgPence: s.bookings ? Math.round(s.revenuePence / s.bookings) : 0 })), [series]);
  const topMonthsByRevenue = useMemo(() => [...series].sort((a, b) => b.revenuePence - a.revenuePence).slice(0, 8), [series]);
  const revenueSharePie = useMemo(() => series.map((s) => ({ name: s.label, value: s.revenuePence })), [series]);

  const bookingsByStatusData = useMemo(() => {
    const m = data?.bookingsByStatusInFilter ?? {};
    return BK_STATUSES.filter((s) => (m[s] ?? 0) > 0).map((s) => ({
      name: BK_STATUS_LABEL[s] || s,
      value: m[s] ?? 0,
      status: s,
    }));
  }, [data?.bookingsByStatusInFilter]);

  const enquiriesVol = data?.enquiriesVolumeSeries?.length ? data.enquiriesVolumeSeries : [];

  const [expandedChart, setExpandedChart] = useState<string | null>(null);

  const toggleStatus = (s: string) => {
    setStatuses((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  if (err) {
    return (
      <div className="admin-reports">
        <p className="admin-reports-error">{err}</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="admin-reports admin-reports--loading">
        <div className="admin-reports-skeleton-wrap" aria-hidden>
          <div className="admin-reports-skeleton admin-reports-skeleton--hero" />
          <div className="admin-reports-skeleton-grid">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="admin-reports-skeleton admin-reports-skeleton--card" />
            ))}
          </div>
          <div className="admin-reports-skeleton admin-reports-skeleton--chart" />
        </div>
        <p className="admin-reports-loading-text">Loading analytics…</p>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="admin-reports">
      <div className="admin-page-banner">
        <header className="admin-bk-hero admin-reports-hero">
          <div className="admin-bk-hero-text">
            <p className="admin-dash-kicker">Finance</p>
            <h1 className="admin-page-title admin-bk-title">Reports &amp; analytics</h1>
            <p className="admin-lead admin-bk-lead">
              Revenue by event month, enquiry pipeline, and venue KPIs. Filter by event date range and booking status.
            </p>
          </div>
          <div className="admin-bk-hero-actions admin-reports-hero-actions">
            {at ? (
              <time className="admin-reports-updated" dateTime={at.toISOString()}>
                Updated {at.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
              </time>
            ) : null}
            <button type="button" className="admin-btn admin-btn-ghost" onClick={() => fetchSummary()}>
              Refresh data
            </button>
            <button type="button" className="admin-btn admin-btn-primary" onClick={handlePrint}>
              Export / Print PDF
            </button>
          </div>
        </header>
      </div>

      <div className="admin-reports-filters no-print">
        <div className="admin-reports-filters-row">
          <div className="admin-reports-filters-block">
            <span className="admin-reports-filters-label">Event date</span>
            <div className="admin-reports-filters-dates">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setDatePreset("custom");
                }}
                className="admin-reports-filters-input"
                aria-label="From date"
              />
              <span className="admin-reports-filters-arrow" aria-hidden>
                →
              </span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setDatePreset("custom");
                }}
                className="admin-reports-filters-input"
                aria-label="To date"
              />
            </div>
          </div>
          <div className="admin-reports-filters-block">
            <span className="admin-reports-filters-label">Booking status</span>
            <div className="admin-reports-filters-chips">
              {BK_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleStatus(s)}
                  className={statuses.includes(s) ? "admin-reports-filter-chip admin-reports-filter-chip--on" : "admin-reports-filter-chip"}
                  aria-pressed={statuses.includes(s)}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <button type="button" className="admin-btn admin-btn-primary admin-reports-filters-apply" onClick={() => fetchSummary()}>
            Apply
          </button>
        </div>
        <div className="admin-reports-presets">
          <span className="admin-reports-presets-label" id="reports-presets-label">
            Quick range
          </span>
          <div className="admin-reports-presets-row" role="group" aria-labelledby="reports-presets-label">
            {REPORT_DATE_PRESETS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={datePreset === id ? "admin-reports-preset-chip admin-reports-preset-chip--on" : "admin-reports-preset-chip"}
                aria-pressed={datePreset === id}
                onClick={() => applyDatePreset(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <p className="admin-reports-filters-hint">
          <strong>Quick range</strong> sets event dates and <strong>reloads booking charts</strong> (revenue, events, filtered bookings). Change{" "}
          <strong>status</strong> chips and click <strong>Apply</strong> to refresh with the same dates. Enquiry pipeline charts are venue-wide;{" "}
          <strong>New enquiries per month</strong> is always by submission date.
        </p>
      </div>

      <div className="admin-stats-unified-wrap">
        <AdminStatsCards
          items={[
            { label: "All bookings", value: data.bookingsTotal, hint: "Whole database" },
            { label: "In filter", value: inFilter, hint: "Events matching filters", variant: "gold" },
            { label: "Filter revenue", value: GBP(totalRev), hint: statuses.join(", ") || "—" },
            { label: "Enquiries", value: data.enquiriesTotal, hint: `${data.leadConversionRate}% converted`, variant: "accent" },
          ]}
        />
      </div>

      <div className="admin-reports-grid">
        <section className="admin-reports-card admin-reports-chart-main">
          <div className="admin-reports-card-head admin-reports-card-head--with-action">
            <div>
              <h2 className="admin-reports-card-title">Revenue by month</h2>
              <p className="admin-reports-card-desc">Total booking revenue for each event month. Uses your current date and status filters.</p>
            </div>
            <button type="button" className="admin-reports-expand-btn" onClick={() => setExpandedChart("revenue-by-month")} aria-label="Expand chart">Expand</button>
          </div>
          <div className="admin-reports-chart-h">
            {series.length === 0 ? (
              <p className="admin-reports-empty">No booking revenue yet — add events with amounts to see data.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series} margin={{ top: 12, right: 20, left: 56, bottom: 28 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => axisGBP(Number(v))} tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} width={52} tickCount={5} allowDecimals={false} />
                  <Tooltip cursor={false} formatter={(v) => [GBP(Number(v)), "Revenue"]} contentStyle={{ borderRadius: 10, border: "1px solid var(--color-border)", background: "var(--color-bg)" }} labelFormatter={(_, p) => (p?.[0]?.payload as SeriesRow)?.label ?? ""} />
                  <Bar dataKey="revenuePence" name="Revenue" fill="var(--color-gold)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="admin-reports-card admin-reports-chart-main">
          <div className="admin-reports-card-head admin-reports-card-head--with-action">
            <div>
              <h2 className="admin-reports-card-title">Events per month</h2>
              <p className="admin-reports-card-desc">Count of bookings (events) in each month. Only includes statuses you have selected in the filter.</p>
            </div>
            <button type="button" className="admin-reports-expand-btn" onClick={() => setExpandedChart("events-per-month")} aria-label="Expand chart">Expand</button>
          </div>
          <div className="admin-reports-chart-h">
            {series.length === 0 ? (
              <p className="admin-reports-empty">No bookings yet — data appears when events have dates.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series} margin={{ top: 12, right: 20, left: 40, bottom: 28 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} width={32} tickCount={5} />
                  <Tooltip cursor={false} formatter={(v) => [Number(v), "Events"]} contentStyle={{ borderRadius: 10, border: "1px solid var(--color-border)", background: "var(--color-bg)" }} labelFormatter={(_, p) => (p?.[0]?.payload as SeriesRow)?.label ?? ""} />
                  <Bar dataKey="bookings" name="Events" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="admin-reports-card admin-reports-chart-main">
          <div className="admin-reports-card-head admin-reports-card-head--with-action">
            <div>
              <h2 className="admin-reports-card-title">Revenue trend</h2>
              <p className="admin-reports-card-desc">Revenue over time so you can spot peaks and dips. Same data as the revenue bar chart, shown as a line.</p>
            </div>
            <button type="button" className="admin-reports-expand-btn" onClick={() => setExpandedChart("revenue-trend")} aria-label="Expand chart">Expand</button>
          </div>
          <div className="admin-reports-chart-h">
            {series.length === 0 ? (
              <p className="admin-reports-empty">No revenue data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 12, right: 20, left: 56, bottom: 28 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => axisGBP(Number(v))} tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} width={52} tickCount={5} allowDecimals={false} />
                  <Tooltip cursor={false} formatter={(v) => [GBP(Number(v)), "Revenue"]} contentStyle={{ borderRadius: 10, border: "1px solid var(--color-border)", background: "var(--color-bg)" }} labelFormatter={(_, p) => (p?.[0]?.payload as SeriesRow)?.label ?? ""} />
                  <Line type="monotone" dataKey="revenuePence" name="Revenue" stroke="var(--color-gold)" strokeWidth={2} dot={{ r: 4, fill: "var(--color-bg)", stroke: "var(--color-gold)" }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="admin-reports-card admin-reports-chart-main">
          <div className="admin-reports-card-head admin-reports-card-head--with-action">
            <div>
              <h2 className="admin-reports-card-title">Revenue per booking</h2>
              <p className="admin-reports-card-desc">Average revenue per event in each month (total revenue ÷ number of bookings). Shows value per booking over time.</p>
            </div>
            <button type="button" className="admin-reports-expand-btn" onClick={() => setExpandedChart("revenue-per-booking")} aria-label="Expand chart">Expand</button>
          </div>
          <div className="admin-reports-chart-h">
            {revenuePerBooking.length === 0 || revenuePerBooking.every((s) => s.avgPence === 0) ? (
              <p className="admin-reports-empty">No data — need months with both revenue and bookings.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenuePerBooking} margin={{ top: 12, right: 20, left: 56, bottom: 28 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => axisGBP(Number(v))} tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} width={52} tickCount={5} allowDecimals={false} />
                  <Tooltip cursor={false} formatter={(v) => [GBP(Number(v)), "Avg per booking"]} contentStyle={{ borderRadius: 10, border: "1px solid var(--color-border)", background: "var(--color-bg)" }} labelFormatter={(_, p) => (p?.[0]?.payload as SeriesRow)?.label ?? ""} />
                  <Bar dataKey="avgPence" name="Avg per booking" fill="#059669" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="admin-reports-card admin-reports-chart-main">
          <div className="admin-reports-card-head admin-reports-card-head--with-action">
            <div>
              <h2 className="admin-reports-card-title">Top months by revenue</h2>
              <p className="admin-reports-card-desc">Months ranked by total revenue (highest first). Up to 8 months shown. Helps identify your strongest periods.</p>
            </div>
            <button type="button" className="admin-reports-expand-btn" onClick={() => setExpandedChart("top-months")} aria-label="Expand chart">Expand</button>
          </div>
          <div className="admin-reports-chart-h">
            {topMonthsByRevenue.length === 0 ? (
              <p className="admin-reports-empty">No revenue data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topMonthsByRevenue} layout="vertical" margin={{ top: 8, right: 20, left: 56, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v) => axisGBP(Number(v))} tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="label" width={64} tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={false} formatter={(v) => [GBP(Number(v)), "Revenue"]} contentStyle={{ borderRadius: 10, border: "1px solid var(--color-border)", background: "var(--color-bg)" }} />
                  <Bar dataKey="revenuePence" name="Revenue" fill="var(--color-gold)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="admin-reports-card admin-reports-chart-main">
          <div className="admin-reports-card-head admin-reports-card-head--with-action">
            <div>
              <h2 className="admin-reports-card-title">Revenue share by month</h2>
              <p className="admin-reports-card-desc">What share of total (filtered) revenue each month represents. Use to see which months drive most income.</p>
            </div>
            <button type="button" className="admin-reports-expand-btn" onClick={() => setExpandedChart("revenue-share")} aria-label="Expand chart">Expand</button>
          </div>
          <div className="admin-reports-chart-h admin-reports-chart-h--pie">
            {revenueSharePie.length === 0 || revenueSharePie.every((d) => d.value === 0) ? (
              <p className="admin-reports-empty">No revenue data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={revenueSharePie}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={78}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={{ stroke: "var(--color-border)" }}
                  >
                    {revenueSharePie.map((_, i) => (
                      <Cell key={i} fill={["var(--color-gold)", "#1e3a5f", "#059669", "#6366f1", "#d97706", "#dc2626", "#7c3aed", "#0d9488"][i % 8]} />
                    ))}
                  </Pie>
                  <Tooltip cursor={false} formatter={(v) => [GBP(Number(v)), "Revenue"]} contentStyle={{ borderRadius: 10, border: "1px solid var(--color-border)", background: "var(--color-bg)" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="admin-reports-card admin-reports-chart-main">
          <div className="admin-reports-card-head admin-reports-card-head--with-action">
            <div>
              <h2 className="admin-reports-card-title">Bookings by status (filtered)</h2>
              <p className="admin-reports-card-desc">
                How filtered events split across Pending, Confirmed, Completed, and Cancelled. Only bookings matching your event date range and status chips above.
              </p>
            </div>
            <button
              type="button"
              className="admin-reports-expand-btn"
              onClick={() => setExpandedChart("bookings-by-status-filter")}
              aria-label="Expand chart"
            >
              Expand
            </button>
          </div>
          <div className="admin-reports-chart-h">
            {bookingsByStatusData.length === 0 ? (
              <p className="admin-reports-empty">No bookings match the current filters — widen the date range or include more statuses.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bookingsByStatusData} margin={{ top: 12, right: 16, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={92} tick={{ fontSize: 12, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={false}
                    formatter={(v) => [Number(v) || 0, "Bookings"]}
                    contentStyle={{ borderRadius: 10, border: "1px solid var(--color-border)", background: "var(--color-bg)" }}
                  />
                  <Bar dataKey="value" name="Bookings" radius={[0, 6, 6, 0]}>
                    {bookingsByStatusData.map((entry, i) => (
                      <Cell key={i} fill={BK_STATUS_COLORS[entry.status] || "#6366f1"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="admin-reports-card admin-reports-chart-main">
          <div className="admin-reports-card-head admin-reports-card-head--with-action">
            <div>
              <h2 className="admin-reports-card-title">New enquiries per month</h2>
              <p className="admin-reports-card-desc">
                Inbound lead volume by month (when each enquiry was submitted). Independent of booking filters — shows marketing and form activity over time.
              </p>
            </div>
            <button
              type="button"
              className="admin-reports-expand-btn"
              onClick={() => setExpandedChart("enquiries-per-month")}
              aria-label="Expand chart"
            >
              Expand
            </button>
          </div>
          <div className="admin-reports-chart-h">
            {enquiriesVol.length === 0 ? (
              <p className="admin-reports-empty">No enquiries yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={enquiriesVol} margin={{ top: 12, right: 20, left: 36, bottom: 28 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} width={32} tickCount={5} />
                  <Tooltip
                    cursor={false}
                    formatter={(v) => [Number(v) || 0, "New enquiries"]}
                    contentStyle={{ borderRadius: 10, border: "1px solid var(--color-border)", background: "var(--color-bg)" }}
                    labelFormatter={(_, p) => (p?.[0]?.payload as EnquiryVolRow)?.label ?? ""}
                  />
                  <Bar dataKey="count" name="Enquiries" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="admin-reports-card admin-reports-chart-side">
          <div className="admin-reports-card-head admin-reports-card-head--with-action">
            <div>
              <h2 className="admin-reports-card-title">Enquiries by status</h2>
              <p className="admin-reports-card-desc">Share of enquiries in each pipeline stage: New, Contacted, Quoted, Converted, Lost. Percentages show the mix.</p>
            </div>
            <button type="button" className="admin-reports-expand-btn" onClick={() => setExpandedChart("enquiries-by-status")} aria-label="Expand chart">Expand</button>
          </div>
          <div className="admin-reports-chart-h admin-reports-chart-h--pie">
            {pieData.length === 0 || pieData.every((d) => d.value === 0) ? (
              <p className="admin-reports-empty">No enquiries yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={78}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={{ stroke: "var(--color-border)" }}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.status] || `hsl(${(i * 47) % 360}, 45%, 50%)`} />
                    ))}
                  </Pie>
                  <Tooltip
                    cursor={false}
                    formatter={(value) => [Number(value) || 0, "Enquiries"]}
                    contentStyle={{
                      borderRadius: 10,
                      border: "1px solid var(--color-border)",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                      background: "var(--color-bg)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="admin-reports-card admin-reports-card--wide admin-reports-chart-full">
          <div className="admin-reports-card-head admin-reports-card-head--with-action">
            <div>
              <h2 className="admin-reports-card-title">Enquiry volume by stage</h2>
              <p className="admin-reports-card-desc">Number of enquiries in each stage. Use this to see where leads sit in the pipeline and prioritise follow-up.</p>
            </div>
            <button type="button" className="admin-reports-expand-btn" onClick={() => setExpandedChart("enquiry-volume")} aria-label="Expand chart">Expand</button>
          </div>
          <div className="admin-reports-chart-h admin-reports-chart-h--bar">
            {pieData.length === 0 ? (
              <p className="admin-reports-empty">No data.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pieData} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={88} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={false}
                    formatter={(v) => [Number(v) || 0, "Count"]}
                    contentStyle={{ borderRadius: 10, border: "1px solid var(--color-border)", background: "var(--color-bg)" }}
                  />
                  <Bar dataKey="value" name="Enquiries" radius={[0, 6, 6, 0]}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.status] || `hsl(${(i * 47) % 360}, 45%, 50%)`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

      </div>

      {expandedChart && (
        <div className="admin-reports-expand-overlay" role="dialog" aria-modal aria-labelledby="expand-chart-title">
          <div className="admin-reports-expand-backdrop" onClick={() => setExpandedChart(null)} aria-hidden />
          <div className="admin-reports-expand-modal">
            <div className="admin-reports-expand-head">
              <h2 id="expand-chart-title" className="admin-reports-expand-title">
                {expandedChart === "revenue-by-month" && "Revenue by month"}
                {expandedChart === "events-per-month" && "Events per month"}
                {expandedChart === "revenue-trend" && "Revenue trend"}
                {expandedChart === "revenue-per-booking" && "Revenue per booking"}
                {expandedChart === "top-months" && "Top months by revenue"}
                {expandedChart === "revenue-share" && "Revenue share by month"}
                {expandedChart === "enquiries-by-status" && "Enquiries by status"}
                {expandedChart === "enquiry-volume" && "Enquiry volume by stage"}
                {expandedChart === "bookings-by-status-filter" && "Bookings by status (filtered)"}
                {expandedChart === "enquiries-per-month" && "New enquiries per month"}
              </h2>
              <button type="button" className="admin-reports-expand-close" onClick={() => setExpandedChart(null)} aria-label="Close">×</button>
            </div>
            <div className="admin-reports-expand-about">
              {expandedChart === "revenue-by-month" && "Total booking revenue for each event month. Amounts are in pounds and reflect only bookings that match your current filters (event date range and selected statuses). Use this to see which months generate the most income."}
              {expandedChart === "events-per-month" && "Number of bookings (events) in each month. Each bar is the count of events in that month that match your filters. Helps you see busy vs quiet periods."}
              {expandedChart === "revenue-trend" && "Revenue over time as a line. Same underlying data as the revenue bar chart; the line makes it easier to spot trends, seasonal patterns, and growth or decline."}
              {expandedChart === "revenue-per-booking" && "Average revenue per booking in each month (total revenue ÷ number of bookings). Shows whether you are earning more per event over time, independent of volume."}
              {expandedChart === "top-months" && "Months sorted by total revenue, highest first. Shows your best-performing months at a glance. Up to 8 months are shown. Use with the date filter to focus on a specific period."}
              {expandedChart === "revenue-share" && "Each slice is one month’s share of total (filtered) revenue. Percentages show how much of your revenue came from each month. Helps identify concentration in certain periods."}
              {expandedChart === "enquiries-by-status" && "Share of all enquiries in each pipeline stage: New, Contacted, Quoted, Converted, Lost. Percentages show the current mix. Use to balance follow-up and spot bottlenecks."}
              {expandedChart === "enquiry-volume" && "Count of enquiries in each stage. Complements the pie chart by showing exact numbers. Use to prioritise which stages need attention and to track pipeline health."}
              {expandedChart === "bookings-by-status-filter" &&
                "Breakdown of bookings that match your current filters (event date range and selected booking statuses). See how many events are pending vs confirmed vs completed vs cancelled within that slice."}
              {expandedChart === "enquiries-per-month" &&
                "Number of new enquiry form submissions per calendar month (based on created date). This is not filtered by booking date — it shows inbound lead trends to compare with marketing and seasonality."}
            </div>
            <div className="admin-reports-expand-chart">
              {expandedChart === "revenue-by-month" && series.length > 0 && (
                <ResponsiveContainer width="100%" height={360}>
                  <BarChart data={series} margin={{ top: 16, right: 24, left: 60, bottom: 32 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(v) => axisGBP(Number(v))} tick={{ fontSize: 12, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} width={56} tickCount={6} allowDecimals={false} />
                    <Tooltip cursor={false} formatter={(v) => [GBP(Number(v)), "Revenue"]} contentStyle={{ borderRadius: 10, border: "1px solid var(--color-border)", background: "var(--color-bg)" }} labelFormatter={(_, p) => (p?.[0]?.payload as SeriesRow)?.label ?? ""} />
                    <Bar dataKey="revenuePence" name="Revenue" fill="var(--color-gold)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
              {expandedChart === "events-per-month" && series.length > 0 && (
                <ResponsiveContainer width="100%" height={360}>
                  <BarChart data={series} margin={{ top: 16, right: 24, left: 44, bottom: 32 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} width={36} tickCount={6} />
                    <Tooltip cursor={false} formatter={(v) => [Number(v), "Events"]} contentStyle={{ borderRadius: 10, border: "1px solid var(--color-border)", background: "var(--color-bg)" }} labelFormatter={(_, p) => (p?.[0]?.payload as SeriesRow)?.label ?? ""} />
                    <Bar dataKey="bookings" name="Events" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
              {expandedChart === "revenue-trend" && series.length > 0 && (
                <ResponsiveContainer width="100%" height={360}>
                  <LineChart data={series} margin={{ top: 16, right: 24, left: 60, bottom: 32 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(v) => axisGBP(Number(v))} tick={{ fontSize: 12, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} width={56} tickCount={6} allowDecimals={false} />
                    <Tooltip cursor={false} formatter={(v) => [GBP(Number(v)), "Revenue"]} contentStyle={{ borderRadius: 10, border: "1px solid var(--color-border)", background: "var(--color-bg)" }} labelFormatter={(_, p) => (p?.[0]?.payload as SeriesRow)?.label ?? ""} />
                    <Line type="monotone" dataKey="revenuePence" stroke="var(--color-gold)" strokeWidth={2} dot={{ r: 5, fill: "var(--color-bg)", stroke: "var(--color-gold)" }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
              {expandedChart === "revenue-per-booking" && revenuePerBooking.length > 0 && (
                <ResponsiveContainer width="100%" height={360}>
                  <BarChart data={revenuePerBooking} margin={{ top: 16, right: 24, left: 60, bottom: 32 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(v) => axisGBP(Number(v))} tick={{ fontSize: 12, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} width={56} tickCount={6} allowDecimals={false} />
                    <Tooltip cursor={false} formatter={(v) => [GBP(Number(v)), "Avg per booking"]} contentStyle={{ borderRadius: 10, border: "1px solid var(--color-border)", background: "var(--color-bg)" }} labelFormatter={(_, p) => (p?.[0]?.payload as SeriesRow)?.label ?? ""} />
                    <Bar dataKey="avgPence" name="Avg per booking" fill="#059669" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
              {expandedChart === "top-months" && topMonthsByRevenue.length > 0 && (
                <ResponsiveContainer width="100%" height={360}>
                  <BarChart data={topMonthsByRevenue} layout="vertical" margin={{ top: 12, right: 24, left: 60, bottom: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => axisGBP(Number(v))} tick={{ fontSize: 12, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="label" width={72} tick={{ fontSize: 12, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={false} formatter={(v) => [GBP(Number(v)), "Revenue"]} contentStyle={{ borderRadius: 10, border: "1px solid var(--color-border)", background: "var(--color-bg)" }} />
                    <Bar dataKey="revenuePence" name="Revenue" fill="var(--color-gold)" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
              {expandedChart === "revenue-share" && revenueSharePie.length > 0 && (
                <ResponsiveContainer width="100%" height={360}>
                  <PieChart>
                    <Pie data={revenueSharePie} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={2} dataKey="value" nameKey="name" label={({ name, percent }) => `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={{ stroke: "var(--color-border)" }}>
                      {revenueSharePie.map((_, i) => <Cell key={i} fill={["var(--color-gold)", "#1e3a5f", "#059669", "#6366f1", "#d97706", "#dc2626", "#7c3aed", "#0d9488"][i % 8]} />)}
                    </Pie>
                    <Tooltip cursor={false} formatter={(v) => [GBP(Number(v)), "Revenue"]} contentStyle={{ borderRadius: 10, border: "1px solid var(--color-border)", background: "var(--color-bg)" }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
              {expandedChart === "enquiries-by-status" && pieData.length > 0 && (
                <ResponsiveContainer width="100%" height={360}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={2} dataKey="value" nameKey="name" label={({ name, percent }) => `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={{ stroke: "var(--color-border)" }}>
                      {pieData.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.status] || `hsl(${(i * 47) % 360}, 45%, 50%)`} />)}
                    </Pie>
                    <Tooltip cursor={false} formatter={(v) => [Number(v) || 0, "Enquiries"]} contentStyle={{ borderRadius: 10, border: "1px solid var(--color-border)", background: "var(--color-bg)" }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
              {expandedChart === "enquiry-volume" && pieData.length > 0 && (
                <ResponsiveContainer width="100%" height={360}>
                  <BarChart data={pieData} layout="vertical" margin={{ left: 12, right: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={false} formatter={(v) => [Number(v) || 0, "Count"]} contentStyle={{ borderRadius: 10, border: "1px solid var(--color-border)", background: "var(--color-bg)" }} />
                    <Bar dataKey="value" name="Enquiries" radius={[0, 6, 6, 0]}>
                      {pieData.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.status] || `hsl(${(i * 47) % 360}, 45%, 50%)`} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
              {expandedChart === "bookings-by-status-filter" && bookingsByStatusData.length > 0 && (
                <ResponsiveContainer width="100%" height={360}>
                  <BarChart data={bookingsByStatusData} layout="vertical" margin={{ left: 12, right: 24, top: 12, bottom: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={false} formatter={(v) => [Number(v) || 0, "Bookings"]} contentStyle={{ borderRadius: 10, border: "1px solid var(--color-border)", background: "var(--color-bg)" }} />
                    <Bar dataKey="value" name="Bookings" radius={[0, 6, 6, 0]}>
                      {bookingsByStatusData.map((entry, i) => (
                        <Cell key={i} fill={BK_STATUS_COLORS[entry.status] || "#6366f1"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
              {expandedChart === "enquiries-per-month" && enquiriesVol.length > 0 && (
                <ResponsiveContainer width="100%" height={360}>
                  <BarChart data={enquiriesVol} margin={{ top: 16, right: 24, left: 44, bottom: 32 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} width={40} tickCount={6} />
                    <Tooltip
                      cursor={false}
                      formatter={(v) => [Number(v) || 0, "New enquiries"]}
                      contentStyle={{ borderRadius: 10, border: "1px solid var(--color-border)", background: "var(--color-bg)" }}
                      labelFormatter={(_, p) => (p?.[0]?.payload as EnquiryVolRow)?.label ?? ""}
                    />
                    <Bar dataKey="count" name="Enquiries" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="admin-reports-expand-actions">
              <button type="button" className="admin-btn admin-btn-primary" onClick={() => setExpandedChart(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
