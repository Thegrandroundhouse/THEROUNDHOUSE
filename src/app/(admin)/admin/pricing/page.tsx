"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-api-client";
import { useAdminDialog } from "@/components/admin/AdminDialogContext";
import { AdminStatsCards } from "@/components/admin/AdminStatsCards";

function gbp(c: number | null) {
  if (c == null) return "—";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(c / 100);
}

/** Compact £ for small calendar cells (no pence when whole pounds). */
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

function getBandForDate(rows: Season[], dateStr: string) {
  return rows.find((r) => r.active && dateStr >= r.date_start && dateStr <= r.date_end) ?? null;
}

function getDayOverride(dayRows: DayOverride[], dateStr: string): DayOverride | null {
  return dayRows.find((r) => r.event_date === dateStr) ?? null;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function PricingPage() {
  const { alert } = useAdminDialog();
  const [rows, setRows] = useState<Season[]>([]);
  const [dayOverrides, setDayOverrides] = useState<DayOverride[]>([]);
  const [migration, setMigration] = useState(false);
  const [f, setF] = useState({ name: "", date_start: "", date_end: "", pounds: "", note: "" });
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayOverridePounds, setDayOverridePounds] = useState("");
  const [dayOverrideNote, setDayOverrideNote] = useState("");
  const [savingDay, setSavingDay] = useState(false);

  const load = useCallback(() => {
    adminFetch("/api/admin/season-pricing")
      .then((r) => r.json())
      .then((d) => {
        if (d.needsMigration) setMigration(true);
        else setRows(Array.isArray(d) ? d : []);
      });
    adminFetch("/api/admin/day-pricing")
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => setDayOverrides(Array.isArray(list) ? list : []))
      .catch(() => setDayOverrides([]));
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

  const add = async () => {
    const suggested_total_cents = f.pounds.trim() ? Math.round(parseFloat(f.pounds) * 100) : null;
    const res = await adminFetch("/api/admin/season-pricing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: f.name || "Season",
        date_start: f.date_start,
        date_end: f.date_end,
        suggested_total_cents,
        note: f.note || null,
      }),
    });
    if (!res.ok) await alert(await res.text());
    else {
      setF({ name: "", date_start: "", date_end: "", pounds: "", note: "" });
      load();
    }
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
      if (!res.ok) await alert(await res.text());
      else load();
    } finally {
      setSavingDay(false);
    }
  };

  const clearDayOverride = async () => {
    if (!selectedDate) return;
    setSavingDay(true);
    try {
      const res = await adminFetch(`/api/admin/day-pricing?date=${selectedDate}`, { method: "DELETE" });
      if (!res.ok) await alert(await res.text());
      else {
        setDayOverridePounds("");
        setDayOverrideNote("");
        load();
      }
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
            <p className="admin-dash-kicker">Availability & rates</p>
            <h1 className="admin-page-title admin-bk-title">Season pricing</h1>
            <p className="admin-lead admin-bk-lead">
              Set date bands and per-day overrides. New bookings use the price for the chosen event date. Full venue / whole
              day and slot labels are under{" "}
              <Link href="/admin/settings" className="admin-link">
                Settings → Booking slots
              </Link>
              .
            </p>
          </div>
          <div className="admin-bk-hero-actions">
            <Link href="/admin/calendar" className="admin-btn admin-btn-primary">
              Calendar
            </Link>
            <Link href="/admin/bookings/new" className="admin-btn admin-btn-ghost">
              New booking
            </Link>
          </div>
        </header>
      </div>

      {migration && (
        <div className="admin-pricing-banner">
          Run <code>017_vendors_payments_seasons.sql</code> for season bands.
        </div>
      )}

      <div className="admin-stats-unified-wrap">
        <AdminStatsCards
          ariaLabel="Pricing summary"
          items={[
            { label: "Season bands", value: rows.length },
            { label: "Active", value: rows.filter((r) => r.active).length, variant: "ok" },
            { label: "With price", value: rows.filter((r) => r.suggested_total_cents != null).length, variant: "gold" },
            { label: "Day overrides", value: dayOverrides.length, hint: "Per-date" },
          ]}
        />
      </div>

      <div className="admin-pricing-main">
        <section className="admin-pricing-calendar-card admin-card">
          <div className="admin-pricing-calendar-header">
            <button type="button" className="admin-pricing-nav" onClick={prevMonth} aria-label="Previous month">
              ‹
            </button>
            <h2 className="admin-pricing-calendar-title">{monthLabel}</h2>
            <button type="button" className="admin-pricing-nav" onClick={nextMonth} aria-label="Next month">
              ›
            </button>
          </div>
          <div className="admin-pricing-legend">
            <span className="admin-pricing-legend-item admin-pricing-legend-season">Season</span>
            <span className="admin-pricing-legend-item admin-pricing-legend-override">Day override</span>
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
                        : "No season or override"
                  }
                  role="gridcell"
                >
                  <span className="admin-pricing-calendar-cell-num">{d}</span>
                  {(override || band) && (
                    <span className="admin-pricing-calendar-cell-meta">
                      {override ? (
                        <>
                          <span className="admin-pricing-calendar-cell-price admin-pricing-calendar-cell-price--override">
                            {gbpCell(override.suggested_total_cents)}
                          </span>
                          <span className="admin-pricing-calendar-cell-seasontag">Day override</span>
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
              <h3 className="admin-pricing-detail-title">
                {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </h3>
              {(() => {
                const band = getBandForDate(rows, selectedDate);
                const override = getDayOverride(dayOverrides, selectedDate);
                return (
                  <div className="admin-pricing-detail-source">
                    {override ? (
                      <p className="admin-pricing-detail-line">
                        <strong>Day override</strong> {gbp(override.suggested_total_cents)}
                        {override.note && <span className="admin-pay-muted"> — {override.note}</span>}
                      </p>
                    ) : band ? (
                      <p className="admin-pricing-detail-line">
                        <strong>Season</strong> {band.name} {gbp(band.suggested_total_cents)}
                        {band.note && <span className="admin-pay-muted"> — {band.note}</span>}
                      </p>
                    ) : (
                      <p className="admin-pricing-detail-line admin-pay-muted">No season or override for this date.</p>
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
                  />
                </label>
                <label className="admin-form-group">
                  <span>Note (optional)</span>
                  <input value={dayOverrideNote} onChange={(e) => setDayOverrideNote(e.target.value)} placeholder="e.g. Sale price" />
                </label>
                <div className="admin-pricing-detail-actions">
                  <button type="button" className="admin-btn admin-btn-primary admin-btn-sm" onClick={saveDayOverride} disabled={savingDay}>
                    {savingDay ? "Saving…" : "Save override"}
                  </button>
                  {getDayOverride(dayOverrides, selectedDate) && (
                    <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={clearDayOverride} disabled={savingDay}>
                      Clear override
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="admin-card admin-pricing-detail admin-pricing-detail-empty">
              <p className="admin-pay-muted">Click a date on the calendar to set or edit its price.</p>
            </div>
          )}
        </aside>
      </div>

      <section className="admin-pricing-season-wrap">
        <div className="admin-pricing-season-card">
          <div className="admin-pricing-season-accent" aria-hidden />
          <div className="admin-pricing-season-body">
            <header className="admin-pricing-season-head">
              <span className="admin-pricing-season-kicker">New band</span>
              <h2 className="admin-pricing-season-title">Add season band</h2>
              <p className="admin-pricing-season-desc">
                A named date range with an optional suggested total. Applies to every day in the range unless you set a day override on the calendar.
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
                <span className="admin-pricing-season-label">Note <span className="admin-pricing-season-optional">optional</span></span>
                <input
                  value={f.note}
                  onChange={(e) => setF((x) => ({ ...x, note: e.target.value }))}
                  placeholder="Internal note for this band"
                  className="admin-pricing-season-input"
                />
              </label>
            </div>
            <div className="admin-pricing-season-actions">
              <button type="button" className="admin-btn admin-btn-primary admin-pricing-season-submit" onClick={add}>
                Add season band
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="admin-pricing-tables">
        <section className="admin-card admin-unified-layout">
          <h2 className="admin-section-title">Season bands</h2>
          {rows.length === 0 ? (
            <p className="admin-pay-muted">No season bands yet. Add one above.</p>
          ) : (
            <div className="admin-pay-table-wrap">
              <table className="admin-pay-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Date range</th>
                    <th>Suggested total</th>
                    <th>Note</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td><strong>{r.name}</strong></td>
                      <td>{r.date_start} → {r.date_end}</td>
                      <td className="admin-pay-amt">{gbp(r.suggested_total_cents)}</td>
                      <td style={{ color: "var(--color-text-muted)" }}>{r.note ?? "—"}</td>
                      <td>
                        <button
                          type="button"
                          className="admin-btn admin-btn-ghost admin-btn-sm"
                          style={{ color: "var(--color-text-muted)" }}
                          onClick={async () => {
                            await adminFetch(`/api/admin/season-pricing/${r.id}`, { method: "DELETE" });
                            load();
                          }}
                        >
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

        {dayOverrides.length > 0 && (
          <section className="admin-card admin-unified-layout">
            <h2 className="admin-section-title">Day overrides</h2>
            <div className="admin-pay-table-wrap">
              <table className="admin-pay-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Price</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {dayOverrides.map((o) => (
                    <tr key={o.event_date}>
                      <td>{o.event_date}</td>
                      <td className="admin-pay-amt">{gbp(o.suggested_total_cents)}</td>
                      <td style={{ color: "var(--color-text-muted)" }}>{o.note ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
