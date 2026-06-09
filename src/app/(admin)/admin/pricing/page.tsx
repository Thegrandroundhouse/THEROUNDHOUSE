"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { adminFetch, parseAdminError } from "@/lib/admin-api-client";
import { AdminMigrationBanner } from "@/components/admin/AdminMigrationBanner";
import { useAdminDialog } from "@/components/admin/AdminDialogContext";
import { AdminStatsCards } from "@/components/admin/AdminStatsCards";

function gbp(c: number | null) {
  if (c == null) return "—";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(c / 100);
}

function gbpCell(c: number | null) {
  if (c == null) return "—";
  const n = c / 100;
  if (Number.isInteger(n) && n >= 1000)
    return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: n % 1 === 0 ? 0 : 2 }).format(n);
}

type Season = {
  id: string;
  name: string;
  date_start: string;
  date_end: string;
  suggested_total_cents: number | null;
  note: string | null;
  active: boolean;
};

type DayOverride = { event_date: string; suggested_total_cents: number | null; note: string | null };

type GuideStep = {
  title: string;
  desc: string;
  action: "scroll" | "link";
  target: string;
  cta: string;
};

const GUIDE_STEPS: GuideStep[] = [
  {
    title: "Add season bands",
    desc: "Name a date range (e.g. Peak summer, Off-peak) and set a suggested venue total for every day in that range.",
    action: "scroll",
    target: "pricing-add-band",
    cta: "Go to form ↓",
  },
  {
    title: "Override single days",
    desc: "Click a date on the calendar to set a one-off price — sale days, special holds, or bespoke quotes.",
    action: "scroll",
    target: "pricing-calendar",
    cta: "Open calendar ↓",
  },
  {
    title: "Used on new bookings",
    desc: "When you pick an event date on Create booking, the suggested total auto-fills from override or season (you can still change it).",
    action: "link",
    target: "/admin/bookings/new",
    cta: "New booking →",
  },
  {
    title: "Packages & contracts",
    desc: "Catalog packages add line items to contracts. Season pricing is the starting suggested total — not a hard lock.",
    action: "link",
    target: "/admin/packages",
    cta: "Packages →",
  },
  {
    title: "Calendar & slots",
    desc: "Pricing does not block dates. Use Calendar for availability and Settings → Booking slots for time bands.",
    action: "link",
    target: "/admin/calendar",
    cta: "Calendar →",
  },
  {
    title: "Settings",
    desc: "Full venue / whole day and contact-form slot labels live under Settings → Booking slots.",
    action: "link",
    target: "/admin/settings?tab=slots",
    cta: "Booking slots →",
  },
];

function getBandForDate(rows: Season[], dateStr: string) {
  return rows.find((r) => r.active && dateStr >= r.date_start && dateStr <= r.date_end) ?? null;
}

function getDayOverride(dayRows: DayOverride[], dateStr: string): DayOverride | null {
  return dayRows.find((r) => r.event_date === dateStr) ?? null;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function PricingPage() {
  const { alert, confirm } = useAdminDialog();
  const [rows, setRows] = useState<Season[]>([]);
  const [dayOverrides, setDayOverrides] = useState<DayOverride[]>([]);
  const [migration, setMigration] = useState(false);
  const [dayMigration, setDayMigration] = useState(false);
  const [loading, setLoading] = useState(true);
  const [guideOpen, setGuideOpen] = useState(true);
  const [f, setF] = useState({ name: "", date_start: "", date_end: "", pounds: "", note: "" });
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayOverridePounds, setDayOverridePounds] = useState("");
  const [dayOverrideNote, setDayOverrideNote] = useState("");
  const [savingDay, setSavingDay] = useState(false);
  const [addingBand, setAddingBand] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      adminFetch("/api/admin/season-pricing")
        .then((r) => r.json())
        .then((d) => {
          if (d.needsMigration) setMigration(true);
          else {
            setMigration(false);
            setRows(Array.isArray(d) ? d : []);
          }
        }),
      adminFetch("/api/admin/day-pricing")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d && typeof d === "object" && "needsMigration" in d && d.needsMigration) {
            setDayMigration(true);
            setDayOverrides([]);
            return;
          }
          setDayMigration(false);
          setDayOverrides(Array.isArray(d) ? d : []);
        })
        .catch(() => {
          setDayMigration(false);
          setDayOverrides([]);
        }),
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (selectedDate) {
      const override = getDayOverride(dayOverrides, selectedDate);
      setDayOverridePounds(override?.suggested_total_cents != null ? (override.suggested_total_cents / 100).toFixed(2) : "");
      setDayOverrideNote(override?.note ?? "");
    }
  }, [selectedDate, dayOverrides]);

  const selectDateOnCalendar = (dateStr: string) => {
    setSelectedDate(dateStr);
    const [yy, mm] = dateStr.split("-");
    setCalendarMonth(`${yy}-${mm}`);
    scrollToSection("pricing-calendar");
  };

  const add = async () => {
    if (!f.date_start || !f.date_end) {
      await alert("Choose a start and end date for the season band.");
      return;
    }
    if (f.date_end < f.date_start) {
      await alert("End date must be on or after the start date.");
      return;
    }
    setAddingBand(true);
    try {
      const suggested_total_cents = f.pounds.trim() ? Math.round(parseFloat(f.pounds.replace(/[^0-9.]/g, "")) * 100) : null;
      const res = await adminFetch("/api/admin/season-pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: f.name.trim() || "Season",
          date_start: f.date_start,
          date_end: f.date_end,
          suggested_total_cents,
          note: f.note.trim() || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        await alert(typeof j.error === "string" ? j.error : "Could not add season band");
        return;
      }
      setF({ name: "", date_start: "", date_end: "", pounds: "", note: "" });
      load();
    } finally {
      setAddingBand(false);
    }
  };

  const removeBand = async (r: Season) => {
    if (
      !(await confirm(`Remove season band “${r.name}” (${r.date_start} → ${r.date_end})?`, {
        title: "Remove season band",
        variant: "danger",
        confirmLabel: "Remove",
      }))
    )
      return;
    const res = await adminFetch(`/api/admin/season-pricing/${r.id}`, { method: "DELETE" });
    if (!res.ok) {
      await alert(await parseAdminError(res, "Couldn’t remove season band"));
      return;
    }
    load();
  };

  const saveDayOverride = async () => {
    if (!selectedDate) return;
    setSavingDay(true);
    try {
      const cents = dayOverridePounds.trim() ? Math.round(parseFloat(dayOverridePounds.replace(/[^0-9.]/g, "")) * 100) : null;
      const res = await adminFetch("/api/admin/day-pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_date: selectedDate,
          suggested_total_cents: cents,
          note: dayOverrideNote.trim() || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        await alert(typeof j.error === "string" ? j.error : "Could not save override");
        return;
      }
      load();
    } finally {
      setSavingDay(false);
    }
  };

  const clearDayOverride = async () => {
    if (!selectedDate) return;
    setSavingDay(true);
    try {
      const res = await adminFetch(`/api/admin/day-pricing?date=${selectedDate}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        await alert(typeof j.error === "string" ? j.error : "Could not clear override");
        return;
      }
      setDayOverridePounds("");
      setDayOverrideNote("");
      load();
    } finally {
      setSavingDay(false);
    }
  };

  const [y, m] = calendarMonth.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0);
  const startPad = (first.getDay() + 6) % 7;
  const daysInMonth = last.getDate();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const monthLabel = `${MONTHS[m - 1]} ${y}`;

  const prevMonth = () => {
    const d = new Date(y, m - 2, 1);
    setCalendarMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };
  const nextMonth = () => {
    const d = new Date(y, m, 1);
    setCalendarMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  return (
    <div className="admin-pricing-v2">
      <div className="admin-page-banner">
        <header className="admin-bk-hero">
          <div className="admin-bk-hero-text">
            <p className="admin-dash-kicker">Availability &amp; rates</p>
            <h1 className="admin-page-title admin-bk-title">Season pricing</h1>
            <p className="admin-lead admin-bk-lead">
              Set date bands and per-day overrides. New bookings pick up the suggested total for the event date — you can
              still override the sale price on each booking.
            </p>
          </div>
          <div className="admin-bk-hero-actions">
            <button type="button" className="admin-btn admin-btn-ghost" disabled={loading} onClick={() => load()}>
              {loading ? "Loading…" : "Refresh"}
            </button>
            <Link href="/admin/calendar" className="admin-btn admin-btn-primary">
              Calendar
            </Link>
            <Link href="/admin/bookings/new" className="admin-btn admin-btn-ghost">
              New booking
            </Link>
          </div>
        </header>
      </div>

      {migration ? (
        <AdminMigrationBanner migrationCode="017_vendors_payments_seasons.sql" feature="season pricing bands" />
      ) : null}
      {dayMigration ? (
        <AdminMigrationBanner migrationCode="021_venue_day_pricing.sql" feature="per-day price overrides on the calendar" />
      ) : null}

      <section className="admin-pricing-guide" aria-labelledby="pricing-guide-title">
        <div className="admin-pricing-guide-head">
          <div>
            <p className="admin-pricing-guide-kicker">How to use</p>
            <h2 id="pricing-guide-title" className="admin-pricing-guide-title">
              Season pricing guide
            </h2>
            <p className="admin-pricing-guide-lead">Click a step below — each card jumps to the right place or opens a related page.</p>
          </div>
          <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setGuideOpen((x) => !x)}>
            {guideOpen ? "Hide guide" : "Show guide"}
          </button>
        </div>
        {guideOpen ? (
          <>
            <div className="admin-pricing-guide-grid">
              {GUIDE_STEPS.map((step) =>
                step.action === "link" ? (
                  <Link key={step.title} href={step.target} className="admin-pricing-guide-step">
                    <span className="admin-pricing-guide-step-title">{step.title}</span>
                    <span className="admin-pricing-guide-step-desc">{step.desc}</span>
                    <span className="admin-pricing-guide-step-cta">{step.cta}</span>
                  </Link>
                ) : (
                  <button
                    key={step.title}
                    type="button"
                    className="admin-pricing-guide-step"
                    onClick={() => scrollToSection(step.target)}
                  >
                    <span className="admin-pricing-guide-step-title">{step.title}</span>
                    <span className="admin-pricing-guide-step-desc">{step.desc}</span>
                    <span className="admin-pricing-guide-step-cta">{step.cta}</span>
                  </button>
                ),
              )}
            </div>
            <div id="pricing-priority" className="admin-pricing-priority">
              <strong>Price priority on a date:</strong>{" "}
              <span className="admin-pricing-priority-step admin-pricing-priority-step--override">1. Day override</span>
              <span aria-hidden>→</span>
              <span className="admin-pricing-priority-step admin-pricing-priority-step--season">2. Season band</span>
              <span aria-hidden>→</span>
              <span className="admin-pricing-priority-step">3. Manual entry on booking</span>
            </div>
          </>
        ) : null}
      </section>

      {!migration ? (
        <div className="admin-stats-unified-wrap">
          <AdminStatsCards
            ariaLabel="Pricing summary"
            items={[
              { label: "Season bands", value: rows.length },
              { label: "Active", value: rows.filter((r) => r.active).length, variant: "ok" },
              { label: "With price", value: rows.filter((r) => r.suggested_total_cents != null).length, variant: "gold" },
              { label: "Day overrides", value: dayOverrides.length, hint: "One-off dates" },
            ]}
          />
        </div>
      ) : null}

      {loading ? (
        <div className="admin-pricing-loading" aria-busy="true">
          <p className="admin-settings-loading">Loading pricing…</p>
        </div>
      ) : (
        <>
          <div className="admin-pricing-main">
            <section id="pricing-calendar" className="admin-pricing-calendar-card admin-card admin-pricing-section-anchor">
              <header className="admin-pricing-section-head">
                <p className="admin-pricing-section-kicker">Calendar</p>
                <h2 className="admin-pricing-section-title">Pick a date to override</h2>
                <p className="admin-pricing-section-desc">Gold = season band · Green = day override · Click any day to edit its price in the sidebar.</p>
              </header>
              <div className="admin-pricing-calendar-header">
                <button type="button" className="admin-pricing-nav" onClick={prevMonth} aria-label="Previous month">
                  ‹
                </button>
                <h3 className="admin-pricing-calendar-title">{monthLabel}</h3>
                <button type="button" className="admin-pricing-nav" onClick={nextMonth} aria-label="Next month">
                  ›
                </button>
              </div>
              <div className="admin-pricing-legend">
                <span className="admin-pricing-legend-item admin-pricing-legend-season">Season band</span>
                <span className="admin-pricing-legend-item admin-pricing-legend-override">Day override</span>
                <span className="admin-pricing-legend-item admin-pricing-legend-selected">Selected</span>
              </div>
              <div className="admin-pricing-calendar" role="grid" aria-label={`Calendar ${monthLabel}`}>
                {DOW.map((day) => (
                  <div key={day} className="admin-pricing-calendar-head" role="columnheader">
                    {day}
                  </div>
                ))}
                {Array.from({ length: startPad }, (_, i) => (
                  <div key={`pad-${i}`} className="admin-pricing-calendar-cell admin-pricing-calendar-cell--empty" />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const d = i + 1;
                  const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                  const band = getBandForDate(rows, dateStr);
                  const override = getDayOverride(dayOverrides, dateStr);
                  const isSelected = selectedDate === dateStr;
                  const isToday = dateStr === todayStr;
                  return (
                    <button
                      key={dateStr}
                      type="button"
                      className={`admin-pricing-calendar-cell ${band ? "admin-pricing-calendar-cell--season" : ""} ${override ? "admin-pricing-calendar-cell--override" : ""} ${override || band ? "admin-pricing-calendar-cell--rich" : ""} ${isSelected ? "admin-pricing-calendar-cell--selected" : ""} ${isToday ? "admin-pricing-calendar-cell--today" : ""}`}
                      onClick={() => setSelectedDate(dateStr)}
                      title={
                        override
                          ? `Day override: ${gbp(override.suggested_total_cents)}${override.note ? ` — ${override.note}` : ""}`
                          : band
                            ? `Season: ${band.name} · ${gbp(band.suggested_total_cents)}${band.note ? ` — ${band.note}` : ""}`
                            : "No season or override — click to add"
                      }
                      role="gridcell"
                      aria-selected={isSelected}
                    >
                      <span className="admin-pricing-calendar-cell-num">{d}</span>
                      {(override || band) && (
                        <span className="admin-pricing-calendar-cell-meta">
                          {override ? (
                            <>
                              <span className="admin-pricing-calendar-cell-price admin-pricing-calendar-cell-price--override">
                                {gbpCell(override.suggested_total_cents)}
                              </span>
                              <span className="admin-pricing-calendar-cell-seasontag">Override</span>
                            </>
                          ) : band ? (
                            <>
                              <span className="admin-pricing-calendar-cell-seasonname">{band.name}</span>
                              <span className="admin-pricing-calendar-cell-price">{gbpCell(band.suggested_total_cents)}</span>
                            </>
                          ) : null}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            <aside className="admin-pricing-sidebar">
              {selectedDate ? (
                <div className="admin-card admin-pricing-detail">
                  <p className="admin-pricing-detail-kicker">Day override</p>
                  <h3 className="admin-pricing-detail-title">
                    {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-GB", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </h3>
                  {(() => {
                    const band = getBandForDate(rows, selectedDate);
                    const override = getDayOverride(dayOverrides, selectedDate);
                    return (
                      <div className="admin-pricing-detail-source">
                        {override ? (
                          <p className="admin-pricing-detail-line admin-pricing-detail-line--override">
                            <strong>Active override</strong> {gbp(override.suggested_total_cents)}
                            {override.note ? <span className="admin-pay-muted"> — {override.note}</span> : null}
                          </p>
                        ) : band ? (
                          <p className="admin-pricing-detail-line admin-pricing-detail-line--season">
                            <strong>Season band</strong> {band.name} · {gbp(band.suggested_total_cents)}
                            {band.note ? <span className="admin-pay-muted"> — {band.note}</span> : null}
                            <span className="admin-pricing-detail-hint">Save below to replace with a day override.</span>
                          </p>
                        ) : (
                          <p className="admin-pricing-detail-line admin-pay-muted">No season or override — add a price below or leave blank on booking.</p>
                        )}
                      </div>
                    );
                  })()}
                  <div className="admin-pricing-detail-form">
                    <label className="admin-form-group">
                      <span>Override price for this day (£)</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={dayOverridePounds}
                        onChange={(e) => setDayOverridePounds(e.target.value)}
                        placeholder="e.g. 4500"
                        className="admin-pricing-detail-input"
                      />
                    </label>
                    <label className="admin-form-group">
                      <span>Note (optional)</span>
                      <input
                        value={dayOverrideNote}
                        onChange={(e) => setDayOverrideNote(e.target.value)}
                        placeholder="e.g. Sale price"
                        className="admin-pricing-detail-input"
                      />
                    </label>
                    <div className="admin-pricing-detail-actions">
                      <button type="button" className="admin-btn admin-btn-primary admin-btn-sm" onClick={saveDayOverride} disabled={savingDay}>
                        {savingDay ? "Saving…" : "Save override"}
                      </button>
                      {getDayOverride(dayOverrides, selectedDate) ? (
                        <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={clearDayOverride} disabled={savingDay}>
                          Clear override
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="admin-card admin-pricing-detail admin-pricing-detail-empty">
                  <p className="admin-pricing-detail-kicker">Day override</p>
                  <h3 className="admin-pricing-detail-title">Select a date</h3>
                  <p className="admin-pay-muted">Click a day on the calendar to set or edit a one-off price for that date.</p>
                  <button type="button" className="admin-link-btn" onClick={() => scrollToSection("pricing-calendar")}>
                    Jump to calendar
                  </button>
                </div>
              )}
            </aside>
          </div>

          <section id="pricing-add-band" className="admin-pricing-season-wrap admin-pricing-section-anchor">
            <div className="admin-pricing-season-card">
              <div className="admin-pricing-season-accent" aria-hidden />
              <div className="admin-pricing-season-body">
                <header className="admin-pricing-season-head">
                  <span className="admin-pricing-season-kicker">Season bands</span>
                  <h2 className="admin-pricing-season-title">Add season band</h2>
                  <p className="admin-pricing-season-desc">
                    A named date range with an optional suggested total. Applies to every day in the range unless you set a
                    day override on the calendar above.
                  </p>
                </header>
                <div className="admin-pricing-season-grid">
                  <label className="admin-pricing-season-field admin-pricing-season-field--wide">
                    <span className="admin-pricing-season-label">Band name</span>
                    <input
                      value={f.name}
                      onChange={(e) => setF((x) => ({ ...x, name: e.target.value }))}
                      placeholder="e.g. Peak summer"
                      className="admin-pricing-season-input"
                    />
                  </label>
                  <label className="admin-pricing-season-field">
                    <span className="admin-pricing-season-label">From</span>
                    <input
                      type="date"
                      value={f.date_start}
                      onChange={(e) => setF((x) => ({ ...x, date_start: e.target.value }))}
                      className="admin-pricing-season-input"
                    />
                  </label>
                  <label className="admin-pricing-season-field">
                    <span className="admin-pricing-season-label">To</span>
                    <input
                      type="date"
                      value={f.date_end}
                      onChange={(e) => setF((x) => ({ ...x, date_end: e.target.value }))}
                      className="admin-pricing-season-input"
                    />
                  </label>
                  <label className="admin-pricing-season-field">
                    <span className="admin-pricing-season-label">Suggested total (£)</span>
                    <input
                      value={f.pounds}
                      onChange={(e) => setF((x) => ({ ...x, pounds: e.target.value }))}
                      placeholder="15000"
                      inputMode="decimal"
                      className="admin-pricing-season-input admin-pricing-season-input--accent"
                    />
                  </label>
                  <label className="admin-pricing-season-field admin-pricing-season-field--wide">
                    <span className="admin-pricing-season-label">
                      Note <span className="admin-pricing-season-optional">optional</span>
                    </span>
                    <input
                      value={f.note}
                      onChange={(e) => setF((x) => ({ ...x, note: e.target.value }))}
                      placeholder="Internal note for this band"
                      className="admin-pricing-season-input"
                    />
                  </label>
                </div>
                <div className="admin-pricing-season-actions">
                  <button type="button" className="admin-btn admin-btn-primary admin-pricing-season-submit" disabled={addingBand} onClick={add}>
                    {addingBand ? "Adding…" : "Add season band"}
                  </button>
                </div>
              </div>
            </div>
          </section>

          <div className="admin-pricing-tables">
            <section className="admin-card admin-unified-layout">
              <header className="admin-pricing-section-head admin-pricing-section-head--compact">
                <h2 className="admin-section-title">Season bands</h2>
                <p className="admin-pricing-section-desc">All configured date ranges. Remove a band if it is no longer used.</p>
              </header>
              {rows.length === 0 ? (
                <p className="admin-pay-muted">No season bands yet — add one above or click &ldquo;Add season bands&rdquo; in the guide.</p>
              ) : (
                <div className="admin-pay-table-wrap">
                  <table className="admin-pay-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Date range</th>
                        <th>Suggested total</th>
                        <th>Note</th>
                        <th aria-label="Actions" />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id}>
                          <td>
                            <strong>{r.name}</strong>
                          </td>
                          <td>
                            {r.date_start} → {r.date_end}
                          </td>
                          <td className="admin-pay-amt">{gbp(r.suggested_total_cents)}</td>
                          <td className="admin-pay-muted">{r.note ?? "—"}</td>
                          <td>
                            <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => removeBand(r)}>
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {dayOverrides.length > 0 ? (
              <section className="admin-card admin-unified-layout">
                <header className="admin-pricing-section-head admin-pricing-section-head--compact">
                  <h2 className="admin-section-title">Day overrides</h2>
                  <p className="admin-pricing-section-desc">Click a row to jump to that date on the calendar.</p>
                </header>
                <div className="admin-pay-table-wrap">
                  <table className="admin-pay-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Price</th>
                        <th>Note</th>
                        <th aria-label="Actions" />
                      </tr>
                    </thead>
                    <tbody>
                      {dayOverrides.map((o) => (
                        <tr key={o.event_date}>
                          <td>
                            <button type="button" className="admin-link-btn" onClick={() => selectDateOnCalendar(o.event_date)}>
                              {o.event_date}
                            </button>
                          </td>
                          <td className="admin-pay-amt">{gbp(o.suggested_total_cents)}</td>
                          <td className="admin-pay-muted">{o.note ?? "—"}</td>
                          <td>
                            <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => selectDateOnCalendar(o.event_date)}>
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
