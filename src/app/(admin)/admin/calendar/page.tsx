"use client";

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { adminFetch, parseAdminError } from "@/lib/admin-api-client";
import { useAdminDialog } from "@/components/admin/AdminDialogContext";
import { AdminStatsCards } from "@/components/admin/AdminStatsCards";
import { formatLocalDateParts, todayLocalDateString } from "@/lib/local-date";
import {
  blockLabelForDate,
  blocksForDate,
  dayBlockLevel,
  isHallBlockedOnDate,
  manualBlockedDatesForFilter,
  type VenueHall,
} from "@/lib/booking-halls";

const MONTHS = "January February March April May June July August September October November December".split(" ");
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const YEAR_OPTIONS = Array.from({ length: 16 }, (_, i) => new Date().getFullYear() - 5 + i);

type CalendarViewMode = "month" | "year";

type BookingItem = {
  id: string;
  client_name: string | null;
  client_email: string;
  status: string;
  package_name?: string | null;
  event_type?: string | null;
  event_slot_key?: string | null;
  event_slot_label?: string;
  hall_ids?: string[];
  hall_label?: string;
};
type BookingsByDate = Record<string, BookingItem[]>;
type ManualBlock = { date: string; space_id: string | null; block_note?: string | null };

function todayStr() {
  return todayLocalDateString();
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

type DayCellState = { kind: "booked" | "blocked" | "partial" | "free"; blockLabel: string | null };

function getDayCellState(
  dateStr: string,
  bookings: BookingItem[],
  manualBlocks: ManualBlock[],
  halls: VenueHall[],
  hallFilter: string,
  manualBlocked: Set<string>,
): DayCellState {
  if (bookings.length > 0) return { kind: "booked", blockLabel: null };
  if (hallFilter === "all") {
    const level = dayBlockLevel(
      manualBlocks,
      dateStr,
      halls.map((h) => h.id),
    );
    const blockLabel = blockLabelForDate(manualBlocks, dateStr, halls);
    if (level === "full") return { kind: "blocked", blockLabel };
    if (level === "partial") return { kind: "partial", blockLabel };
    return { kind: "free", blockLabel: null };
  }
  if (manualBlocked.has(dateStr)) {
    return { kind: "blocked", blockLabel: blockLabelForDate(manualBlocks, dateStr, halls) };
  }
  return { kind: "free", blockLabel: null };
}

function blockTargetLabel(target: string, halls: VenueHall[]): string {
  if (target === "whole") return "whole venue (all halls)";
  return halls.find((h) => h.id === target)?.name ?? "this hall";
}

function blockTargetSpaceId(target: string): string | null {
  return target === "whole" ? null : target;
}

function CalendarPageInner() {
  const { confirm, alert } = useAdminDialog();
  const searchParams = useSearchParams();
  const dateFromUrlApplied = useRef(false);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [bookingsByDate, setBookingsByDate] = useState<BookingsByDate>({});
  const [manualBlocks, setManualBlocks] = useState<ManualBlock[]>([]);
  const [halls, setHalls] = useState<VenueHall[]>([]);
  /** all = combined view; hall uuid = filter to one hall */
  const [hallFilter, setHallFilter] = useState<string>("all");
  /** whole = all halls, or a hall id — used when closing / opening days */
  const [blockTarget, setBlockTarget] = useState<string>("whole");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string>("");
  const [rangeBusy, setRangeBusy] = useState(false);
  const [viewModal, setViewModal] = useState<{ booking: BookingItem; dateStr: string } | null>(null);
  /** active = hide cancelled from grid counts; all = every status */
  const [bookingStatusView, setBookingStatusView] = useState<"active" | "all">("active");
  const [slotDayInfo, setSlotDayInfo] = useState<PublicSlotDay | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [dayNote, setDayNote] = useState("");
  const [dayNoteSaving, setDayNoteSaving] = useState(false);
  const [blockNote, setBlockNote] = useState("");
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
  }, [loading, year, month, bookingStatusView, viewMode]);

  useEffect(() => {
    if (hallFilter !== "all" && halls.some((h) => h.id === hallFilter)) {
      setBlockTarget(hallFilter);
    }
  }, [hallFilter, halls]);

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
      setDayNote("");
      return;
    }
    setSlotsLoading(true);
    fetch(`/api/booking-slots?date=${selected}`)
      .then((r) => r.json())
      .then((data: PublicSlotDay) => setSlotDayInfo(data && typeof data === "object" ? data : null))
      .catch(() => setSlotDayInfo(null))
      .finally(() => setSlotsLoading(false));

    adminFetch(`/api/admin/calendar-day-note?date=${selected}`)
      .then((r) => (r.ok ? r.json() : { note: "" }))
      .then((d: { note?: string }) => setDayNote(typeof d.note === "string" ? d.note : ""))
      .catch(() => setDayNote(""));
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
    setLoadError(null);
    try {
      const url =
        viewMode === "year"
          ? `/api/admin/calendar-year?year=${year}`
          : `/api/admin/calendar-month?year=${year}&month=${month}`;
      const res = await adminFetch(url);
      if (!res.ok) throw new Error(await parseAdminError(res, "Couldn’t load calendar"));
      const data = await res.json();
      setBookingsByDate(data.bookingsByDate ?? {});
      setManualBlocks(data.manualBlocks ?? []);
      setHalls(data.halls ?? []);
    } catch (err) {
      setBookingsByDate({});
      setManualBlocks([]);
      setHalls([]);
      setLoadError(err instanceof Error ? err.message : "Couldn’t load calendar");
    } finally {
      setLoading(false);
    }
  }, [year, month, viewMode]);

  useEffect(() => {
    load();
  }, [load]);

  const first = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0).getDate();
  const startDow = first.getDay();
  const days: { d: number; dateStr: string }[] = [];
  for (let d = 1; d <= lastDay; d++) {
    days.push({ d, dateStr: formatLocalDateParts(year, month, d) });
  }

  const allHallIds = halls.map((h) => h.id);
  const manualBlocked = useMemo(
    () => manualBlockedDatesForFilter(manualBlocks, hallFilter as string, allHallIds),
    [manualBlocks, hallFilter, allHallIds],
  );

  const blockSpaceId = blockTargetSpaceId(blockTarget);

  const filteredByDate = useMemo(() => {
    const out: BookingsByDate = {};
    for (const [d, arr] of Object.entries(bookingsByDate)) {
      let list =
        bookingStatusView === "all"
          ? arr
          : arr.filter((b) => b.status !== "cancelled");
      if (hallFilter !== "all") {
        list = list.filter(
          (b) =>
            !b.hall_ids?.length ||
            b.hall_ids.includes(hallFilter),
        );
      }
      if (list.length) out[d] = list;
    }
    return out;
  }, [bookingsByDate, bookingStatusView, hallFilter]);

  const statsDays = useMemo(() => {
    if (viewMode === "month") return days.map(({ dateStr }) => dateStr);
    const out: string[] = [];
    for (let m = 0; m < 12; m++) {
      const lastDay = new Date(year, m + 1, 0).getDate();
      for (let d = 1; d <= lastDay; d++) out.push(formatLocalDateParts(year, m, d));
    }
    return out;
  }, [viewMode, days, year]);

  const stats = useMemo(() => {
    let bookedDays = 0;
    let closedOnly = 0;
    let free = 0;
    let totalBookingsCount = 0;
    for (const dateStr of statsDays) {
      const bookings = filteredByDate[dateStr] ?? [];
      const manual = manualBlocked.has(dateStr);
      if (bookings.length > 0) {
        bookedDays++;
        totalBookingsCount += bookings.length;
      } else if (manual) closedOnly++;
      else free++;
    }
    return { bookedDays, closedOnly, free, total: statsDays.length, totalBookingsCount };
  }, [statsDays, filteredByDate, manualBlocked]);

  const agendaBookings = useMemo(() => {
    return Object.entries(filteredByDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .flatMap(([dateStr, list]) => list.map((b) => ({ dateStr, ...b })));
  }, [filteredByDate]);

  const openMonth = (monthIndex: number, dateStr?: string) => {
    setViewMode("month");
    setMonth(monthIndex);
    if (dateStr) {
      setSelected(dateStr);
      setRangeEnd(dateStr);
    }
  };

  const closeTargetLabel = blockTargetLabel(blockTarget, halls);

  async function postCalendarDay(body: Record<string, unknown>, spaceId?: string | null, note?: string) {
    const sid = spaceId !== undefined ? spaceId : blockSpaceId;
    const payload: Record<string, unknown> = { ...body, space_id: sid };
    if (body.action === "block" && note?.trim()) payload.block_note = note.trim();
    return adminFetch("/api/admin/calendar-day", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  const saveDayNote = async () => {
    if (!selected) return;
    setDayNoteSaving(true);
    try {
      const r = await adminFetch("/api/admin/calendar-day-note", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selected, note: dayNote }),
      });
      if (!r.ok) throw new Error(await parseAdminError(r, "Could not save note"));
      await alert("Day note saved (staff only — not shown on public calendar).");
    } catch (e) {
      await alert(e instanceof Error ? e.message : "Could not save note");
    } finally {
      setDayNoteSaving(false);
    }
  };

  const goToday = () => {
    const t = new Date();
    setYear(t.getFullYear());
    setMonth(t.getMonth());
    setSelected(todayStr());
  };

  async function toggleDay(
    dateStr: string,
    hasBooking: boolean,
    manualOnly: boolean,
    spaceId: string | null = blockSpaceId,
    note?: string,
  ) {
    const targetLabel = blockTargetLabel(spaceId == null ? "whole" : spaceId, halls);
    const noteToSave = note ?? blockNote;
    if (hasBooking) {
      await alert("This date has a booking — open Bookings to change.");
      return;
    }
    if (manualOnly) {
      if (!(await confirm(`Open ${dateStr} for ${targetLabel}?`, { title: "Open day" }))) return;
      const res = await postCalendarDay({ date: dateStr, action: "unblock" }, spaceId);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        await alert(d.error || "Could not unblock");
        return;
      }
    } else {
      if (!(await confirm(`Mark ${dateStr} unavailable for ${targetLabel}?`, { title: "Close day", confirmLabel: "Close day" }))) return;
      const res = await postCalendarDay({ date: dateStr, action: "block" }, spaceId, noteToSave);
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
    if (!(await confirm(`Mark every day from ${selected} through ${rangeEnd} unavailable for ${closeTargetLabel}? Days with bookings are skipped.`, { title: "Close range", confirmLabel: "Close" }))) return;
    setRangeBusy(true);
    try {
      const res = await postCalendarDay({ date: selected, endDate: rangeEnd, action: "block" });
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
    if (!(await confirm(`Remove manual closes from ${selected} through ${rangeEnd} for ${closeTargetLabel}?`, { title: "Open range", confirmLabel: "Open range" }))) return;
    setRangeBusy(true);
    try {
      const res = await postCalendarDay({ date: selected, endDate: rangeEnd, action: "unblock" });
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

  const selectedDayAllBookings = useMemo(() => {
    if (!selected) return [];
    const list = bookingsByDate[selected] ?? [];
    return bookingStatusView === "all" ? list : list.filter((b) => b.status !== "cancelled");
  }, [selected, bookingsByDate, bookingStatusView]);

  const hallDayRows = useMemo(() => {
    if (!selected) return [];
    const rows: {
      key: string;
      label: string;
      spaceId: string | null;
      status: "Available" | "Booked" | "Unavailable";
      bookings: BookingItem[];
      blocked: boolean;
      blockNote: string | null;
    }[] = [];
    const wholeBlocked = isHallBlockedOnDate(manualBlocks, selected, null);
    const wholeBlockRow = manualBlocks.find((b) => b.date === selected && b.space_id == null);
    rows.push({
      key: "whole",
      label: "Whole venue (all halls)",
      spaceId: null,
      status: wholeBlocked ? "Unavailable" : selectedDayAllBookings.length ? "Booked" : "Available",
      bookings: selectedDayAllBookings,
      blocked: wholeBlocked,
      blockNote: wholeBlockRow?.block_note ?? null,
    });
    for (const h of halls) {
      const blocked = isHallBlockedOnDate(manualBlocks, selected, h.id);
      const hallBookings = selectedDayAllBookings.filter(
        (b) => !b.hall_ids?.length || b.hall_ids.includes(h.id),
      );
      const blockRow = manualBlocks.find((b) => b.date === selected && b.space_id === h.id);
      rows.push({
        key: h.id,
        label: h.name,
        spaceId: h.id,
        status: hallBookings.length ? "Booked" : blocked ? "Unavailable" : "Available",
        bookings: hallBookings,
        blocked,
        blockNote: blockRow?.block_note ?? null,
      });
    }
    return rows;
  }, [selected, manualBlocks, halls, selectedDayAllBookings]);

  const selectedTargetBlocked = selected
    ? isHallBlockedOnDate(manualBlocks, selected, blockTarget === "whole" ? null : blockTarget)
    : false;

  const hasBookingForBlockTarget = useMemo(() => {
    if (!selected) return false;
    const list = selectedDayAllBookings;
    if (blockTarget === "whole") return list.length > 0;
    return list.some((b) => !b.hall_ids?.length || b.hall_ids.includes(blockTarget));
  }, [selected, blockTarget, selectedDayAllBookings]);

  const selectedBlockInfo = selected
    ? blocksForDate(manualBlocks, selected)
    : { wholeVenue: false, hallIds: [] as string[] };

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
            <div className="admin-crm-filters-seg admin-cal-view-seg" role="group" aria-label="Calendar view">
              <button
                type="button"
                className={viewMode === "month" ? "admin-crm-filters-seg-btn admin-crm-filters-seg-btn--on" : "admin-crm-filters-seg-btn"}
                onClick={() => setViewMode("month")}
              >
                Month
              </button>
              <button
                type="button"
                className={viewMode === "year" ? "admin-crm-filters-seg-btn admin-crm-filters-seg-btn--on" : "admin-crm-filters-seg-btn"}
                onClick={() => setViewMode("year")}
              >
                Whole year
              </button>
            </div>
            <div className="admin-cal-month-picker-wrap">
              {viewMode === "month" ? (
                <button
                  type="button"
                  className="admin-btn admin-btn-ghost admin-cal-nav-btn"
                  onClick={() => (month === 0 ? (setMonth(11), setYear((y) => y - 1)) : setMonth((m) => m - 1))}
                  aria-label="Previous month"
                >
                  ‹
                </button>
              ) : (
                <button
                  type="button"
                  className="admin-btn admin-btn-ghost admin-cal-nav-btn"
                  onClick={() => setYear((y) => y - 1)}
                  aria-label="Previous year"
                >
                  ‹
                </button>
              )}
              <div className="admin-cal-month-picker">
                {viewMode === "month" ? (
                  <select className="admin-cal-select" value={month} onChange={(e) => setMonth(parseInt(e.target.value, 10))} aria-label="Month">
                    {MONTHS.map((m, i) => (
                      <option key={m} value={i}>
                        {m}
                      </option>
                    ))}
                  </select>
                ) : null}
                <select className="admin-cal-select" value={year} onChange={(e) => setYear(parseInt(e.target.value, 10))} aria-label="Year">
                  {YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              {viewMode === "month" ? (
                <button
                  type="button"
                  className="admin-btn admin-btn-ghost admin-cal-nav-btn"
                  onClick={() => (month === 11 ? (setMonth(0), setYear((y) => y + 1)) : setMonth((m) => m + 1))}
                  aria-label="Next month"
                >
                  ›
                </button>
              ) : (
                <button
                  type="button"
                  className="admin-btn admin-btn-ghost admin-cal-nav-btn"
                  onClick={() => setYear((y) => y + 1)}
                  aria-label="Next year"
                >
                  ›
                </button>
              )}
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

      {loadError ? (
        <div className="admin-pay-banner" style={{ background: "#fee2e2", borderColor: "#ef4444" }} role="alert">
          {loadError}
          <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" style={{ marginLeft: "0.75rem" }} onClick={() => load()}>
            Retry
          </button>
        </div>
      ) : null}

      <div className="admin-stats-unified-wrap">
        <AdminStatsCards
          ariaLabel={viewMode === "year" ? "Year summary" : "Month summary"}
          items={[
            {
              label: viewMode === "year" ? "Bookings this year" : "Bookings this month",
              value: stats.totalBookingsCount,
              variant: "gold",
            },
            {
              label: viewMode === "year" ? "Days with bookings" : "Days with bookings",
              value: stats.bookedDays,
            },
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
            <span className="admin-crm-filters-inline-label">Hall</span>
            <select
              className="admin-cal-select"
              value={hallFilter}
              onChange={(e) => setHallFilter(e.target.value)}
              aria-label="Filter by hall"
            >
              <option value="all">All halls (combined)</option>
              {halls.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
            <span className="admin-crm-filters-inline-label">Bookings</span>
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
            {viewMode === "year"
              ? "Whole-year view — click any day to manage it in the panel, or click a month name to zoom into that month. Hall and booking filters apply to the full year."
              : "Filter the grid by hall. To close days, pick whole venue or a hall in the day panel — labels show on the calendar."}
          </p>
        </section>
        <div className="admin-cal-layout admin-cal-layout--calendar-pair">
        <div className="admin-cal-grid-wrap" ref={calCardRef}>
          {loading ? (
            <p className="admin-lead">Loading…</p>
          ) : viewMode === "year" ? (
            <div className="admin-cal-year">
              {MONTHS.map((monthName, monthIndex) => {
                const first = new Date(year, monthIndex, 1);
                const lastDay = new Date(year, monthIndex + 1, 0).getDate();
                const startDowMonth = first.getDay();
                const monthDays: string[] = [];
                for (let d = 1; d <= lastDay; d++) monthDays.push(formatLocalDateParts(year, monthIndex, d));
                const monthBookings = monthDays.reduce((n, dateStr) => n + (filteredByDate[dateStr]?.length ?? 0), 0);
                const monthBlocked = monthDays.filter((dateStr) => manualBlocked.has(dateStr)).length;
                return (
                  <section key={monthName} className="admin-cal-year-month">
                    <button
                      type="button"
                      className="admin-cal-year-month-head"
                      onClick={() => openMonth(monthIndex)}
                    >
                      <span className="admin-cal-year-month-name">{monthName}</span>
                      <span className="admin-cal-year-month-meta">
                        {monthBookings > 0 ? `${monthBookings} booking${monthBookings === 1 ? "" : "s"}` : "No bookings"}
                        {monthBlocked > 0 ? ` · ${monthBlocked} closed` : ""}
                      </span>
                    </button>
                    <div className="admin-cal-year-mini">
                      {DOW.map((d) => (
                        <span key={`${monthName}-${d}`} className="admin-cal-year-dow">
                          {d.charAt(0)}
                        </span>
                      ))}
                      {Array.from({ length: startDowMonth }, (_, i) => (
                        <span key={`e-${monthName}-${i}`} className="admin-cal-year-cell admin-cal-year-cell--empty" />
                      ))}
                      {monthDays.map((dateStr, idx) => {
                        const bookings = filteredByDate[dateStr] ?? [];
                        const cell = getDayCellState(dateStr, bookings, manualBlocks, halls, hallFilter, manualBlocked);
                        const isSel = selected === dateStr;
                        const today = isToday(dateStr);
                        return (
                          <button
                            key={`${year}-${monthIndex}-${idx}`}
                            type="button"
                            title={[dateStr, cell.blockLabel].filter(Boolean).join(" · ")}
                            onClick={() => {
                              setSelected(dateStr);
                              if (!rangeEnd) setRangeEnd(dateStr);
                            }}
                            className={`admin-cal-year-cell admin-cal-year-cell--${cell.kind} ${isSel ? "admin-cal-year-cell--selected" : ""} ${today ? "admin-cal-year-cell--today" : ""}`}
                          >
                            {parseInt(dateStr.slice(8, 10), 10)}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
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
                const cell = getDayCellState(dateStr, bookings, manualBlocks, halls, hallFilter, manualBlocked);
                const isSel = selected === dateStr;
                const today = isToday(dateStr);
                return (
                  <button
                    key={`${year}-${month}-${d}-${idx}`}
                    type="button"
                    title={[dateStr, cell.blockLabel].filter(Boolean).join(" · ")}
                    onClick={() => {
                      setSelected(dateStr);
                      if (!rangeEnd) setRangeEnd(dateStr);
                    }}
                    className={`admin-cal-cell admin-cal-cell--${cell.kind} ${isSel ? "admin-cal-cell--selected" : ""} ${today ? "admin-cal-cell--today" : ""}`}
                  >
                    <span className="admin-cal-daynum">{d}</span>
                    {today ? <span className="admin-cal-today-dot" aria-hidden /> : null}
                    {cell.kind === "booked" && bookings.length === 1 && (
                      <div className="admin-cal-cell-slots" aria-hidden>
                        <span className="admin-cal-cell-slot-dot" title={bookings[0].event_slot_label || "Full day"}>
                          {(bookings[0].event_slot_label || "All day").split("·")[0].trim().slice(0, 4)}
                        </span>
                      </div>
                    )}
                    {cell.kind === "booked" && bookings.length > 1 && (
                      <div className="admin-cal-cell-slots">
                        {bookings.slice(0, 4).map((b) => (
                          <span key={b.id} className="admin-cal-cell-slot-dot" title={b.event_slot_label || "Full day"}>
                            {(b.event_slot_label || "·").split("·")[0].trim().slice(0, 3)}
                          </span>
                        ))}
                      </div>
                    )}
                    {cell.kind === "booked" && <span className="admin-cal-pill admin-cal-pill--booked">{bookings.length}</span>}
                    {(cell.kind === "blocked" || cell.kind === "partial") && cell.blockLabel ? (
                      <span className={`admin-cal-pill admin-cal-pill--blocked ${cell.kind === "partial" ? "admin-cal-pill--partial" : ""}`}>
                        {cell.blockLabel.length > 14 ? `${cell.blockLabel.slice(0, 13)}…` : cell.blockLabel}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
          <div className="admin-cal-legend">
            <span className="admin-cal-legend-i admin-cal-legend-free">Available</span>
            <span className="admin-cal-legend-i admin-cal-legend-booked">Booked</span>
            <span className="admin-cal-legend-i admin-cal-legend-blocked">Unavailable</span>
            <span className="admin-cal-legend-i admin-cal-legend-partial">Part closed</span>
            <span className="admin-cal-legend-i admin-cal-legend-today">Today</span>
          </div>
        </div>

        <aside
          className={`admin-cal-sidebar${sidebarMatchedH != null ? " admin-cal-sidebar--match-calendar" : ""}`}
          aria-label="Selected day panel"
          style={sidebarMatchedH != null ? { maxHeight: Math.max(sidebarMatchedH, 520) } : undefined}
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
              <p className="admin-cal-sidebar-scroll-hint">Scroll for full day details, hall status, and bookings.</p>

              <section className="admin-cal-hall-status" aria-label="Hall availability on this day">
                <h4 className="admin-cal-sidebar-heading">Halls on this day</h4>
                <p className="admin-cal-hall-status-hint">Close or open whole venue or one hall — each row shows what is booked or blocked.</p>
                <ul className="admin-cal-hall-status-list">
                  {hallDayRows.map((row) => (
                    <li
                      key={row.key}
                      className={`admin-cal-hall-status-row admin-cal-hall-status-row--${row.status.toLowerCase()}`}
                    >
                      <div className="admin-cal-hall-status-main">
                        <strong>{row.label}</strong>
                        <span className="admin-cal-hall-status-badge">{row.status}</span>
                        {row.bookings.length > 0 ? (
                          <span className="admin-cal-hall-status-bookings">
                            {row.bookings.map((b) => b.client_name || b.client_email).join(", ")}
                          </span>
                        ) : row.blockNote ? (
                          <span className="admin-cal-hall-status-note">Note: {row.blockNote}</span>
                        ) : null}
                      </div>
                      <div className="admin-cal-hall-status-actions">
                        {row.bookings.length > 0 ? (
                          <span className="admin-cal-hall-status-note">Has booking</span>
                        ) : row.blocked ? (
                          <button
                            type="button"
                            className="admin-btn admin-btn-ghost admin-btn-sm"
                            onClick={() => toggleDay(selected!, row.bookings.length > 0, true, row.spaceId)}
                          >
                            Open
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="admin-btn admin-btn-ghost admin-btn-sm"
                            onClick={() => toggleDay(selected!, row.bookings.length > 0, false, row.spaceId)}
                          >
                            Close
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="admin-cal-day-note" aria-label="Staff day note">
                <h4 className="admin-cal-sidebar-heading">Staff note</h4>
                <p className="admin-cal-hall-status-hint">Internal only — not shown on the public calendar. Use for reminders, setup, or closure reasons.</p>
                <textarea
                  className="admin-cal-day-note-input"
                  rows={3}
                  value={dayNote}
                  onChange={(e) => setDayNote(e.target.value)}
                  placeholder="e.g. Hall Two closed for maintenance — Hall One still available for enquiries"
                />
                <button
                  type="button"
                  className="admin-btn admin-btn-ghost admin-btn-sm"
                  disabled={dayNoteSaving}
                  onClick={() => void saveDayNote()}
                >
                  {dayNoteSaving ? "Saving…" : "Save note"}
                </button>
              </section>

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
                className={`admin-cal-sidebar-summary ${selectedDayAllBookings.length ? "admin-cal-sidebar-summary--booked" : selectedBlockInfo.wholeVenue || selectedBlockInfo.hallIds.length ? "admin-cal-sidebar-summary--blocked" : "admin-cal-sidebar-summary--free"}`}
                aria-label="Day summary"
              >
                <span className="admin-cal-sidebar-summary-count">
                  {selectedDayAllBookings.length === 0
                    ? "No bookings"
                    : `${selectedDayAllBookings.length} ${selectedDayAllBookings.length === 1 ? "booking" : "bookings"}`}
                </span>
                <span className="admin-cal-sidebar-summary-status">
                  {selectedDayAllBookings.length
                    ? "Booked"
                    : selectedBlockInfo.wholeVenue
                      ? "Whole venue closed"
                      : selectedBlockInfo.hallIds.length
                        ? blockLabelForDate(manualBlocks, selected!, halls) ?? "Part closed"
                        : "Available"}
                </span>
              </div>

              {selectedDayAllBookings.length > 0 && (
                <section className="admin-cal-sidebar-bookings admin-cal-sidebar-bookings--detail" aria-label="All reservations">
                  <h4 className="admin-cal-sidebar-heading">
                    Bookings
                    <span className="admin-cal-sidebar-heading-count">{selectedDayAllBookings.length}</span>
                  </h4>
                  <ul className="admin-cal-sidebar-booking-detail-list">
                    {selectedDayAllBookings.map((b) => (
                      <li key={b.id} className="admin-cal-sidebar-booking-detail">
                        <div className="admin-cal-sidebar-booking-detail-head">
                          <span className="admin-cal-sidebar-booking-name">{b.client_name || b.client_email}</span>
                          <span className={`admin-cal-sidebar-booking-badge admin-cal-sidebar-booking-badge--${b.status}`}>
                            {b.status}
                          </span>
                        </div>
                        <dl className="admin-cal-sidebar-booking-dl">
                          <div>
                            <dt>Email</dt>
                            <dd>{b.client_email}</dd>
                          </div>
                          {b.hall_label ? (
                            <div>
                              <dt>Hall / suite</dt>
                              <dd>{b.hall_label}</dd>
                            </div>
                          ) : null}
                          <div>
                            <dt>Time slot</dt>
                            <dd>{b.event_slot_label || "Full venue (whole day)"}</dd>
                          </div>
                          {b.event_type ? (
                            <div>
                              <dt>Event type</dt>
                              <dd>{b.event_type}</dd>
                            </div>
                          ) : null}
                          {b.package_name ? (
                            <div>
                              <dt>Package</dt>
                              <dd>{b.package_name}</dd>
                            </div>
                          ) : null}
                        </dl>
                        <Link href={`/admin/bookings/${b.id}`} className="admin-btn admin-btn-sm admin-btn-primary admin-cal-sidebar-viewbtn">
                          Open booking
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <div className="admin-cal-sidebar-actions">
                <Link href={`/admin/bookings/new?date=${selected}`} className="admin-cal-sidebar-cta">
                  Create booking for this date
                </Link>
                <section className="admin-cal-sidebar-block-target" aria-label="Close or open">
                  <label className="admin-cal-sidebar-block-target-label">
                    <span>Close / open for</span>
                    <select
                      className="admin-cal-select admin-cal-sidebar-block-select"
                      value={blockTarget}
                      onChange={(e) => setBlockTarget(e.target.value)}
                    >
                      <option value="whole">Whole venue (all halls)</option>
                      {halls.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="admin-cal-sidebar-block-target-label">
                    <span>Block note (optional, staff only)</span>
                    <input
                      className="admin-cal-sidebar-range-input"
                      value={blockNote}
                      onChange={(e) => setBlockNote(e.target.value)}
                      placeholder="e.g. Private viewing — Hall One only"
                    />
                  </label>
                  <div className="admin-cal-sidebar-day-actions">
                    {hasBookingForBlockTarget ? (
                      <p className="admin-cal-sidebar-block-note">This hall / day has a booking — open the booking to change.</p>
                    ) : selectedTargetBlocked ? (
                      <button
                        type="button"
                        className="admin-cal-sidebar-day-btn"
                        onClick={() => toggleDay(selected!, false, true, blockSpaceId)}
                      >
                        Mark available ({closeTargetLabel})
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="admin-cal-sidebar-day-btn"
                        onClick={() => toggleDay(selected!, false, false, blockSpaceId)}
                      >
                        Mark unavailable ({closeTargetLabel})
                      </button>
                    )}
                  </div>
                </section>
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
          <h3 className="admin-cal-agenda-title">
            {viewMode === "year" ? `This year — all bookings (${stats.totalBookingsCount})` : `This month — all bookings (${stats.totalBookingsCount})`}
          </h3>
          <button type="button" className="admin-btn admin-btn-sm admin-btn-ghost" onClick={load}>
            Refresh
          </button>
        </div>
        {agendaBookings.length === 0 ? (
          <p className="admin-cal-agenda-empty">{viewMode === "year" ? "No bookings in this year." : "No bookings in this month."}</p>
        ) : (
          <ul className="admin-cal-agenda-list">
            {agendaBookings.map((b) => (
              <li key={b.id}>
                <span className="admin-cal-agenda-date">{b.dateStr}</span>
                <span>
                  {b.client_name || b.client_email}
                  {b.hall_label ? <span className="admin-cal-agenda-slot"> · {b.hall_label}</span> : null}
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
