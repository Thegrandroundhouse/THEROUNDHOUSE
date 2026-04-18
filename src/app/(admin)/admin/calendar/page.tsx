"use client";

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { adminFetch } from "@/lib/admin-api-client";
import { useAdminDialog } from "@/components/admin/AdminDialogContext";
import { AdminStatsCards } from "@/components/admin/AdminStatsCards";

const MONTHS = "January February March April May June July August September October November December".split(" ");
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type BookingItem = {
  id: string;
  client_name: string | null;
  client_email: string;
  status: string;
  package_name?: string | null;
  event_type?: string | null;
  event_slot_key?: string | null;
  event_slot_label?: string;
};
type BookingsByDate = Record<string, BookingItem[]>;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

type PublicSlotDay = {
  enabled?: boolean;
  slots?: { key: string; label: string; timeLabel?: string; available: boolean; booked?: number; max?: number }[];
  wholeDayAvailable?: boolean;
  wholeDayLabel?: string;
};

const SLOT_TIME_FALLBACK: Record<string, string> = {
  morning: "9:00 – 12:00",
  afternoon: "12:00 – 17:00",
  evening: "17:00 – 22:00",
  night: "22:00 – 02:00",
};

function displaySlotTime(key: string, timeLabel?: string) {
  const t = timeLabel?.trim();
  if (t) return t;
  return SLOT_TIME_FALLBACK[key] ?? "";
}

function CalendarPageInner() {
  const { confirm, alert } = useAdminDialog();
  const searchParams = useSearchParams();
  const dateFromUrlApplied = useRef(false);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [bookingsByDate, setBookingsByDate] = useState<BookingsByDate>({});
  const [manualBlocked, setManualBlocked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string>("");
  const [rangeBusy, setRangeBusy] = useState(false);
  const [viewModal, setViewModal] = useState<{ booking: BookingItem; dateStr: string } | null>(null);
  /** active = hide cancelled from grid counts; all = every status */
  const [bookingStatusView, setBookingStatusView] = useState<"active" | "all">("active");
  const [slotDayInfo, setSlotDayInfo] = useState<PublicSlotDay | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const calCardRef = useRef<HTMLDivElement>(null);
  /** Desktop: sidebar height matches calendar card so both columns align */
  const [sidebarMatchedH, setSidebarMatchedH] = useState<number | null>(null);

  useEffect(() => {
    const el = calCardRef.current;
    if (!el || typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 800px)");
    const update = () => {
      if (!mq.matches) {
        setSidebarMatchedH(null);
        return;
      }
      setSidebarMatchedH(Math.round(el.getBoundingClientRect().height));
    };
    const ro = new ResizeObserver(update);
    ro.observe(el);
    mq.addEventListener("change", update);
    update();
    return () => {
      ro.disconnect();
      mq.removeEventListener("change", update);
    };
  }, [loading, year, month, bookingStatusView]);

  useEffect(() => {
    const d = searchParams.get("date");
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d) && !dateFromUrlApplied.current) {
      dateFromUrlApplied.current = true;
      const dt = new Date(d + "T12:00:00");
      setYear(dt.getFullYear());
      setMonth(dt.getMonth());
      setSelected(d);
      setRangeEnd(d);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!selected) {
      setSlotDayInfo(null);
      return;
    }
    setSlotsLoading(true);
    fetch(`/api/booking-slots?date=${selected}`)
      .then((r) => r.json())
      .then((data: PublicSlotDay) => setSlotDayInfo(data && typeof data === "object" ? data : null))
      .catch(() => setSlotDayInfo(null))
      .finally(() => setSlotsLoading(false));
  }, [selected]);

  useEffect(() => {
    if (!viewModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setViewModal(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewModal]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch(`/api/admin/calendar-month?year=${year}&month=${month}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setBookingsByDate(data.bookingsByDate ?? {});
      setManualBlocked(new Set(data.manualBlockedDates ?? []));
    } catch {
      setBookingsByDate({});
      setManualBlocked(new Set());
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    load();
  }, [load]);

  const first = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0).getDate();
  const startDow = first.getDay();
  const days: { d: number; dateStr: string }[] = [];
  for (let d = 1; d <= lastDay; d++) {
    days.push({ d, dateStr: new Date(year, month, d).toISOString().slice(0, 10) });
  }

  const filteredByDate = useMemo(() => {
    const out: BookingsByDate = {};
    for (const [d, arr] of Object.entries(bookingsByDate)) {
      const f =
        bookingStatusView === "all"
          ? arr
          : arr.filter((b) => b.status !== "cancelled");
      if (f.length) out[d] = f;
    }
    return out;
  }, [bookingsByDate, bookingStatusView]);

  const stats = useMemo(() => {
    let bookedDays = 0;
    let closedOnly = 0;
    let free = 0;
    let totalBookingsCount = 0;
    for (const { dateStr } of days) {
      const bookings = filteredByDate[dateStr] ?? [];
      const manual = manualBlocked.has(dateStr);
      if (bookings.length > 0) {
        bookedDays++;
        totalBookingsCount += bookings.length;
      } else if (manual) closedOnly++;
      else free++;
    }
    return { bookedDays, closedOnly, free, total: days.length, totalBookingsCount };
  }, [days, filteredByDate, manualBlocked]);

  const goToday = () => {
    const t = new Date();
    setYear(t.getFullYear());
    setMonth(t.getMonth());
    setSelected(todayStr());
  };

  async function toggleDay(dateStr: string, hasBooking: boolean, manualOnly: boolean) {
    if (hasBooking) {
      await alert("This date has a booking — open Bookings to change.");
      return;
    }
    if (manualOnly) {
      if (!(await confirm(`Open ${dateStr} for enquiries again?`, { title: "Open day" }))) return;
      const res = await adminFetch("/api/admin/calendar-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateStr, action: "unblock" }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        await alert(d.error || "Could not unblock");
        return;
      }
    } else {
      if (!(await confirm(`Mark ${dateStr} as unavailable on the public calendar?`, { title: "Close day", confirmLabel: "Close day" }))) return;
      const res = await adminFetch("/api/admin/calendar-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateStr, action: "block" }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        await alert(d.error || "Could not block");
        return;
      }
    }
    load();
  }

  async function blockRange() {
    if (!selected || !rangeEnd) {
      await alert("Select a start day, then set end date for the range.");
      return;
    }
    if (selected > rangeEnd) {
      await alert("End date must be on or after start date.");
      return;
    }
    if (!(await confirm(`Mark every day from ${selected} through ${rangeEnd} as unavailable? Days with bookings are skipped.`, { title: "Close range", confirmLabel: "Close" }))) return;
    setRangeBusy(true);
    try {
      const res = await adminFetch("/api/admin/calendar-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selected, endDate: rangeEnd, action: "block" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        await alert(data.error || "Range block failed");
        return;
      }
      const skipped = (data.results || []).filter((r: { skip?: string }) => r.skip === "has_booking").length;
      if (skipped) await alert(`Closed range. ${skipped} day(s) skipped (already have bookings).`);
      load();
    } finally {
      setRangeBusy(false);
    }
  }

  async function openRange() {
    if (!selected || !rangeEnd) {
      await alert("Select start and end dates.");
      return;
    }
    if (selected > rangeEnd) return;
    if (!(await confirm(`Remove manual closes from ${selected} through ${rangeEnd}?`, { title: "Open range", confirmLabel: "Open range" }))) return;
    setRangeBusy(true);
    try {
      const res = await adminFetch("/api/admin/calendar-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selected, endDate: rangeEnd, action: "unblock" }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        await alert(d.error || "Failed");
        return;
      }
      load();
    } finally {
      setRangeBusy(false);
    }
  }

  const selectedBookings = selected ? bookingsByDate[selected] ?? [] : [];
  const selectedManual = selected && manualBlocked.has(selected);
  const selectedHasBooking = selectedBookings.length > 0;

  useEffect(() => {
    if (!selected) {
      setActiveBookingId(null);
      return;
    }
    const list = bookingsByDate[selected] ?? [];
    setActiveBookingId((prev) => {
      if (prev && list.some((b) => b.id === prev)) return prev;
      return list[0]?.id ?? null;
    });
  }, [selected, bookingsByDate]);

  const activeBooking = activeBookingId ? selectedBookings.find((b) => b.id === activeBookingId) : selectedBookings[0];
  const isToday = (dateStr: string) => dateStr === todayStr();

  const publicCalUrl = typeof window !== "undefined" ? `${window.location.origin}/contact` : "/contact";

  const slotStats = useMemo(() => {
    if (!slotDayInfo?.enabled || !Array.isArray(slotDayInfo.slots)) return null;
    const slots = slotDayInfo.slots.map((s) => ({
      ...s,
      timeLabel: displaySlotTime(s.key, s.timeLabel),
      booked: s.booked ?? 0,
      max: s.max ?? 1,
    }));
    const free = slots.filter((s) => s.available).length;
    const total = slots.length;
    const w = !!slotDayInfo.wholeDayAvailable;
    return { free, total, wholeDay: w, slots, wholeDayHint: slotDayInfo.wholeDayLabel };
  }, [slotDayInfo]);

  return (
    <div className="admin-cal">
      <div className="admin-page-banner">
        <header className="admin-bk-hero admin-cal-banner-hero">
          <div className="admin-bk-hero-text">
            <p className="admin-dash-kicker">Operations</p>
            <h1 className="admin-page-title admin-bk-title">Venue calendar</h1>
            <p className="admin-lead admin-bk-lead">
              <strong>Booked</strong> = reservation · <strong>Unavailable</strong> = manually closed. Click a day for details.
            </p>
          </div>
          <div className="admin-bk-hero-actions admin-cal-banner-actions">
            <div className="admin-cal-month-picker-wrap">
              <button
                type="button"
                className="admin-btn admin-btn-ghost admin-cal-nav-btn"
                onClick={() => (month === 0 ? (setMonth(11), setYear((y) => y - 1)) : setMonth((m) => m - 1))}
                aria-label="Previous month"
              >
                ‹
              </button>
              <div className="admin-cal-month-picker">
                <select className="admin-cal-select" value={month} onChange={(e) => setMonth(parseInt(e.target.value, 10))} aria-label="Month">
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i}>
                      {m}
                    </option>
                  ))}
                </select>
                <select className="admin-cal-select" value={year} onChange={(e) => setYear(parseInt(e.target.value, 10))} aria-label="Year">
                  {Array.from({ length: 7 }, (_, i) => now.getFullYear() - 2 + i).map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="admin-btn admin-btn-ghost admin-cal-nav-btn"
                onClick={() => (month === 11 ? (setMonth(0), setYear((y) => y + 1)) : setMonth((m) => m + 1))}
                aria-label="Next month"
              >
                ›
              </button>
            </div>
            <button type="button" className="admin-btn admin-btn-ghost" onClick={goToday}>
              Today
            </button>
            <Link href="/admin/bookings/new" className="admin-btn admin-btn-ghost">
              New booking
            </Link>
            <Link href="/admin/bookings" className="admin-btn admin-btn-primary">
              Bookings
            </Link>
          </div>
        </header>
      </div>

      <div className="admin-stats-unified-wrap">
        <AdminStatsCards
          ariaLabel="Month summary"
          items={[
            { label: "Bookings this month", value: stats.totalBookingsCount, variant: "gold" },
            { label: "Days with bookings", value: stats.bookedDays },
            { label: "Unavailable", value: stats.closedOnly },
            { label: "Available", value: stats.free, variant: "ok" },
            {
              label: "Public calendar",
              value: (
                <a href={publicCalUrl} target="_blank" rel="noopener noreferrer" className="admin-cal-link">
                  Contact page →
                </a>
              ),
            },
          ]}
        />
      </div>

      <div className="admin-cal-pair-section">
        <section className="admin-cal-grid-toolbar" aria-label="Calendar grid display">
          <div className="admin-cal-grid-toolbar-inner">
            <span className="admin-crm-filters-inline-label">Grid</span>
            <div className="admin-crm-filters-seg" role="group">
              <button
                type="button"
                className={bookingStatusView === "active" ? "admin-crm-filters-seg-btn admin-crm-filters-seg-btn--on" : "admin-crm-filters-seg-btn"}
                onClick={() => setBookingStatusView("active")}
              >
                Active bookings
              </button>
              <button
                type="button"
                className={bookingStatusView === "all" ? "admin-crm-filters-seg-btn admin-crm-filters-seg-btn--on" : "admin-crm-filters-seg-btn"}
                onClick={() => setBookingStatusView("all")}
              >
                Include cancelled
              </button>
            </div>
          </div>
          <p className="admin-cal-grid-toolbar-hint">
            “Active” hides cancelled from the grid only; the day panel still lists all bookings for that date.
          </p>
        </section>
        <div className="admin-cal-layout admin-cal-layout--calendar-pair">
        <div className="admin-cal-grid-wrap" ref={calCardRef}>
          {loading ? (
            <p className="admin-lead">Loading…</p>
          ) : (
            <div className="admin-cal-grid">
              {DOW.map((d) => (
                <div key={d} className="admin-cal-dow">
                  {d}
                </div>
              ))}
              {Array.from({ length: startDow }, (_, i) => (
                <div key={`e-${i}`} className="admin-cal-cell admin-cal-cell--empty" />
              ))}
              {days.map(({ d, dateStr }, idx) => {
                const bookings = filteredByDate[dateStr] ?? [];
                const hasBooking = bookings.length > 0;
                const manual = manualBlocked.has(dateStr);
                const isSel = selected === dateStr;
                const today = isToday(dateStr);
                return (
                  <button
                    key={`${year}-${month}-${d}-${idx}`}
                    type="button"
                    onClick={() => {
                      setSelected(dateStr);
                      if (!rangeEnd) setRangeEnd(dateStr);
                    }}
                    className={`admin-cal-cell ${hasBooking ? "admin-cal-cell--booked" : manual ? "admin-cal-cell--blocked" : "admin-cal-cell--free"} ${isSel ? "admin-cal-cell--selected" : ""} ${today ? "admin-cal-cell--today" : ""}`}
                  >
                    <span className="admin-cal-daynum">{d}</span>
                    {today ? <span className="admin-cal-today-dot" aria-hidden /> : null}
                    {hasBooking && bookings.length === 1 && (
                      <div className="admin-cal-cell-slots" aria-hidden>
                        <span className="admin-cal-cell-slot-dot" title={bookings[0].event_slot_label || "Full day"}>
                          {(bookings[0].event_slot_label || "All day").split("·")[0].trim().slice(0, 4)}
                        </span>
                      </div>
                    )}
                    {hasBooking && bookings.length > 1 && (
                      <div className="admin-cal-cell-slots">
                        {bookings.slice(0, 4).map((b) => (
                          <span key={b.id} className="admin-cal-cell-slot-dot" title={b.event_slot_label || "Full day"}>
                            {(b.event_slot_label || "·").split("·")[0].trim().slice(0, 3)}
                          </span>
                        ))}
                      </div>
                    )}
                    {hasBooking && <span className="admin-cal-pill admin-cal-pill--booked">{bookings.length}</span>}
                    {!hasBooking && manual && <span className="admin-cal-pill admin-cal-pill--blocked">Off</span>}
                  </button>
                );
              })}
            </div>
          )}
          <div className="admin-cal-legend">
            <span className="admin-cal-legend-i admin-cal-legend-free">Available</span>
            <span className="admin-cal-legend-i admin-cal-legend-booked">Booked</span>
            <span className="admin-cal-legend-i admin-cal-legend-blocked">Unavailable</span>
            <span className="admin-cal-legend-i admin-cal-legend-today">Today</span>
          </div>
        </div>

        <aside
          className={`admin-cal-sidebar${sidebarMatchedH != null ? " admin-cal-sidebar--match-calendar" : ""}`}
          aria-label="Selected day panel"
          style={
            sidebarMatchedH != null
              ? { height: sidebarMatchedH, maxHeight: sidebarMatchedH, minHeight: sidebarMatchedH }
              : undefined
          }
        >
          {selected ? (
            <>
              <header className="admin-cal-sidebar-header">
                <span className="admin-cal-sidebar-dow">
                  {new Date(selected + "T12:00:00").toLocaleDateString(undefined, { weekday: "long" })}
                </span>
                <span className="admin-cal-sidebar-day">
                  {new Date(selected + "T12:00:00").getDate()}
                </span>
                <span className="admin-cal-sidebar-monthyear">
                  {new Date(selected + "T12:00:00").toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                </span>
              </header>

              <div className="admin-cal-sidebar-body">
              {slotsLoading ? (
                <div className="admin-cal-slots-panel admin-cal-slots-panel--loading">
                  <div className="admin-cal-slots-shimmer" />
                  <p className="admin-cal-slots-loading-text">Loading slot availability…</p>
                </div>
              ) : slotStats ? (
                <section className="admin-cal-slots-panel" aria-label="Time slot availability for public booking">
                  <div className="admin-cal-slots-panel-head">
                    <h4 className="admin-cal-slots-title">Public booking slots</h4>
                    <p className="admin-cal-slots-sub">Same bands as the contact page — times from Settings → Booking slots</p>
                  </div>

                  {slotStats.wholeDay ? (
                    <div className="admin-cal-slots-whole">
                      <span className="admin-cal-slots-whole-mark" aria-hidden>
                        ✦
                      </span>
                      <div>
                        <strong className="admin-cal-slots-whole-title">Whole venue available</strong>
                        <p className="admin-cal-slots-whole-desc">
                          {slotStats.wholeDayHint?.trim() || "Full day can be chosen until any booking is placed on this date."}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <div className="admin-cal-slots-summary-bar">
                    <div className="admin-cal-slots-meter" role="img" aria-label={`${slotStats.free} of ${slotStats.total} slots free`}>
                      {slotStats.slots.map((s) => (
                        <div
                          key={s.key}
                          className={`admin-cal-slots-meter-seg ${s.available ? "admin-cal-slots-meter-seg--free" : "admin-cal-slots-meter-seg--taken"}`}
                          title={`${s.label}: ${s.available ? "available" : "taken"}`}
                        />
                      ))}
                    </div>
                    <p className="admin-cal-slots-summary-text">
                      <strong>{slotStats.free}</strong>
                      <span className="admin-cal-slots-summary-of"> / </span>
                      <strong>{slotStats.total}</strong>
                      <span> time bands free</span>
                    </p>
                  </div>

                  <ul className="admin-cal-slots-cards">
                    {slotStats.slots.map((s) => (
                      <li key={s.key} className={`admin-cal-slot-card ${s.available ? "admin-cal-slot-card--free" : "admin-cal-slot-card--taken"}`}>
                        <div className="admin-cal-slot-card-body">
                          <span className="admin-cal-slot-card-name">{s.label}</span>
                          {s.timeLabel ? (
                            <span className="admin-cal-slot-card-time">
                              <span className="admin-cal-slot-card-time-icon" aria-hidden>
                                🕐
                              </span>
                              {s.timeLabel}
                            </span>
                          ) : null}
                        </div>
                        <div className="admin-cal-slot-card-foot">
                          {s.max > 1 ? (
                            <span className="admin-cal-slot-card-capacity">
                              {s.booked}/{s.max} booked
                            </span>
                          ) : null}
                          <span className={`admin-cal-slot-badge ${s.available ? "admin-cal-slot-badge--ok" : "admin-cal-slot-badge--full"}`}>
                            {s.available ? "Available" : "Taken"}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>

                  {slotStats.total === 0 ? (
                    <p className="admin-cal-slots-empty-hint">
                      Configure bands in <Link href="/admin/settings">Settings → Booking slots</Link>.
                    </p>
                  ) : null}
                </section>
              ) : null}

              <div
                className={`admin-cal-sidebar-summary ${selectedHasBooking ? "admin-cal-sidebar-summary--booked" : selectedManual ? "admin-cal-sidebar-summary--blocked" : "admin-cal-sidebar-summary--free"}`}
                aria-label="Day summary"
              >
                <span className="admin-cal-sidebar-summary-count">
                  {selectedBookings.length === 0 ? "No bookings" : `${selectedBookings.length} ${selectedBookings.length === 1 ? "booking" : "bookings"}`}
                </span>
                <span className="admin-cal-sidebar-summary-status">
                  {selectedHasBooking ? "Booked" : selectedManual ? "Unavailable" : "Available"}
                </span>
              </div>

              {selectedHasBooking && activeBooking && (
                <section className="admin-cal-sidebar-bookings" aria-label="Reservations">
                  <h4 className="admin-cal-sidebar-heading">
                    {selectedBookings.length > 1 ? "Booking on this day" : "Reservation"}
                    <span className="admin-cal-sidebar-heading-count">{selectedBookings.length}</span>
                  </h4>
                  {selectedBookings.length > 1 ? (
                    <div className="admin-cal-sidebar-booking-tabs">
                      <label className="admin-cal-sidebar-booking-tabs-label" htmlFor="cal-booking-tab">
                        Select booking
                      </label>
                      <select
                        id="cal-booking-tab"
                        className="admin-cal-sidebar-booking-tabs-select"
                        value={activeBookingId ?? ""}
                        onChange={(e) => setActiveBookingId(e.target.value)}
                        aria-label="Select booking for this date"
                      >
                        {selectedBookings.map((b, i) => (
                          <option key={b.id} value={b.id}>
                            {i + 1}. {b.client_name || b.client_email || b.id.slice(0, 8)} — {b.status}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                  <ul className="admin-cal-sidebar-booking-list">
                    <li key={activeBooking.id} className="admin-cal-sidebar-booking">
                      <div className="admin-cal-sidebar-booking-trigger" style={{ cursor: "default", flexWrap: "wrap" }}>
                        <span className="admin-cal-sidebar-booking-avatar" aria-hidden>
                          {(activeBooking.client_name || activeBooking.client_email || "?").charAt(0).toUpperCase()}
                        </span>
                        <span className="admin-cal-sidebar-booking-info">
                          <span className="admin-cal-sidebar-booking-name">{activeBooking.client_name || activeBooking.client_email}</span>
                          <span className={`admin-cal-sidebar-booking-badge admin-cal-sidebar-booking-badge--${activeBooking.status}`}>{activeBooking.status}</span>
                          <span className="admin-cal-sidebar-booking-slotline">Customer&apos;s time</span>
                          <span className="admin-cal-sidebar-booking-time" style={{ flexBasis: "100%", marginTop: "0.2rem" }}>
                            {activeBooking.event_slot_label || "Full venue (whole day)"}
                          </span>
                        </span>
                      </div>
                      <Link href={`/admin/bookings/${activeBooking.id}`} className="admin-btn admin-btn-sm admin-btn-primary admin-cal-sidebar-viewbtn">
                        View
                      </Link>
                    </li>
                  </ul>
                </section>
              )}

              <div className="admin-cal-sidebar-actions">
                <Link href={`/admin/bookings/new?date=${selected}`} className="admin-cal-sidebar-cta">
                  Create booking for this date
                </Link>
                <div className="admin-cal-sidebar-day-actions">
                  {!selectedHasBooking && selectedManual && (
                    <button type="button" className="admin-cal-sidebar-day-btn" onClick={() => toggleDay(selected, false, true)}>
                      Mark available
                    </button>
                  )}
                  {!selectedHasBooking && !selectedManual && (
                    <button type="button" className="admin-cal-sidebar-day-btn" onClick={() => toggleDay(selected, false, false)}>
                      Mark unavailable
                    </button>
                  )}
                </div>
              </div>

              <section className="admin-cal-sidebar-range" aria-label="Multi-day range">
                <h4 className="admin-cal-sidebar-range-title">Multi-day range</h4>
                <p className="admin-cal-sidebar-range-hint">From selected day to end date — close or reopen a block of days.</p>
                <label className="admin-cal-sidebar-range-label">
                  <span>End date</span>
                  <input type="date" className="admin-cal-sidebar-range-input" value={rangeEnd} min={selected} onChange={(e) => setRangeEnd(e.target.value)} />
                </label>
                <div className="admin-cal-sidebar-range-btns">
                  <button type="button" className="admin-btn admin-btn-primary admin-cal-sidebar-range-btn" disabled={rangeBusy} onClick={blockRange}>
                    {rangeBusy ? "…" : "Close range"}
                  </button>
                  <button type="button" className="admin-btn admin-btn-ghost admin-cal-sidebar-range-btn" disabled={rangeBusy} onClick={openRange}>
                    Open range
                  </button>
                </div>
              </section>
              </div>
            </>
          ) : (
            <div className="admin-cal-sidebar-empty">
              <div className="admin-cal-sidebar-empty-icon" aria-hidden>📅</div>
              <p className="admin-cal-sidebar-empty-text">Select a day on the calendar to see bookings, manage availability, or create a reservation.</p>
            </div>
          )}
        </aside>
        </div>
      </div>

      <section className="admin-cal-agenda">
        <div className="admin-cal-agenda-head">
          <h3 className="admin-cal-agenda-title">This month — all bookings ({stats.totalBookingsCount})</h3>
          <button type="button" className="admin-btn admin-btn-sm admin-btn-ghost" onClick={load}>
            Refresh
          </button>
        </div>
        {Object.keys(bookingsByDate).length === 0 ? (
          <p className="admin-cal-agenda-empty">No bookings in this month.</p>
        ) : (
          <ul className="admin-cal-agenda-list">
            {Object.entries(bookingsByDate)
              .sort(([a], [b]) => a.localeCompare(b))
              .flatMap(([dateStr, list]) => list.map((b) => ({ dateStr, ...b })))
              .map((b) => (
                <li key={b.id}>
                  <span className="admin-cal-agenda-date">{b.dateStr}</span>
                  <span>
                    {b.client_name || b.client_email}
                    {b.event_slot_label ? <span className="admin-cal-agenda-slot"> · {b.event_slot_label}</span> : null}
                  </span>
                  <span className="admin-cal-agenda-status">{b.status}</span>
                  <Link href={`/admin/bookings/${b.id}`} className="admin-btn admin-btn-sm admin-btn-primary">
                    View
                  </Link>
                </li>
              ))}
          </ul>
        )}
      </section>

      {viewModal && (
        <div
          className="admin-cal-modal-backdrop"
          onClick={() => setViewModal(null)}
          onKeyDown={(e) => e.key === "Escape" && setViewModal(null)}
          role="presentation"
        >
          <div
            className="admin-cal-modal"
            role="dialog"
            aria-modal
            aria-labelledby="admin-cal-modal-heading"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="admin-cal-modal-x" onClick={() => setViewModal(null)} aria-label="Close">
              ×
            </button>
            <div className="admin-cal-modal-head">
              <p className="admin-cal-modal-kicker">
                {new Date(viewModal.dateStr + "T12:00:00").toLocaleDateString("en-GB", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
              <h2 id="admin-cal-modal-heading" className="admin-cal-modal-title">
                {viewModal.booking.client_name || viewModal.booking.client_email}
              </h2>
              <div className="admin-cal-modal-slot">
                <div className="admin-cal-modal-slot-label">Time slot (what they booked)</div>
                <div className="admin-cal-modal-slot-value">
                  {viewModal.booking.event_slot_label || "Full venue — whole day"}
                </div>
              </div>
            </div>
            <div className="admin-cal-modal-body">
              <div className="admin-cal-modal-row">
                <strong>Email</strong>
                <span>{viewModal.booking.client_email}</span>
              </div>
              {viewModal.booking.event_type ? (
                <div className="admin-cal-modal-row">
                  <strong>Event type</strong>
                  <span>{viewModal.booking.event_type}</span>
                </div>
              ) : null}
              {viewModal.booking.package_name ? (
                <div className="admin-cal-modal-row">
                  <strong>Package</strong>
                  <span>{viewModal.booking.package_name}</span>
                </div>
              ) : null}
              <div className="admin-cal-modal-row">
                <strong>Status</strong>
                <span className={`admin-cal-sidebar-booking-badge admin-cal-sidebar-booking-badge--${viewModal.booking.status}`}>
                  {viewModal.booking.status}
                </span>
              </div>
            </div>
            <div className="admin-cal-modal-actions">
              <Link href={`/admin/bookings/${viewModal.booking.id}`} className="admin-btn admin-btn-primary">
                View
              </Link>
              <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setViewModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Suspense
      fallback={
        <div className="admin-cal admin-crm-wide" style={{ padding: "2rem" }}>
          <p className="admin-lead">Loading calendar…</p>
        </div>
      }
    >
      <CalendarPageInner />
    </Suspense>
  );
}
