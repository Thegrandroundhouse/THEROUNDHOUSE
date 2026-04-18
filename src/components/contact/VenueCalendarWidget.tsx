"use client";

import { useState, useEffect } from "react";

const MONTHS = "January February March April May June July August September October November December".split(" ");

/** Calendar date string in local timezone (avoids duplicate keys from UTC shift). */
function localDateStr(year: number, monthIndex: number, day: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

type VenueCalendarWidgetProps = { compact?: boolean; onSelectDate?: (dateStr: string) => void };

export function VenueCalendarWidget({ compact, onSelectDate }: VenueCalendarWidgetProps = {}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [bookedSet, setBookedSet] = useState<Set<string>>(new Set());
  const [partialSet, setPartialSet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [openDates, setOpenDates] = useState<string[]>([]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/availability?year=${year}&month=${month}`)
      .then((res) => res.json())
      .then((data: { bookedDates?: string[]; partialDates?: string[] }) => {
        setBookedSet(new Set(data.bookedDates ?? []));
        setPartialSet(new Set(data.partialDates ?? []));
      })
      .catch(() => {
        setBookedSet(new Set());
        setPartialSet(new Set());
      })
      .finally(() => setLoading(false));
  }, [year, month]);

  useEffect(() => {
    fetch("/api/availability/open-dates?limit=12")
      .then((res) => res.json())
      .then((data: { dates?: string[] }) => setOpenDates(Array.isArray(data.dates) ? data.dates : []))
      .catch(() => setOpenDates([]));
  }, []);

  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const firstDay = first.getDay();
  const todayStr = localDateStr(today.getFullYear(), today.getMonth(), today.getDate());
  const days: { dayNum: number; dateStr: string; isBooked: boolean; isPartial: boolean; isPast: boolean }[] = [];
  for (let d = 1; d <= last.getDate(); d++) {
    const dateStr = localDateStr(year, month, d);
    days.push({
      dayNum: d,
      dateStr,
      isBooked: bookedSet.has(dateStr),
      isPartial: partialSet.has(dateStr),
      isPast: dateStr < todayStr,
    });
  }

  function prevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  }

  const content = (
    <div className={compact ? "calendar-widget max-w-full" : "calendar-widget"}>
          <div className="calendar-header">
            <button
              type="button"
              onClick={prevMonth}
              aria-label="Previous month"
              className="min-h-[44px] min-w-[44px] touch-manipulation"
            >
              ‹
            </button>
            <span className="calendar-title">
              {MONTHS[month]} {year}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              aria-label="Next month"
              className="min-h-[44px] min-w-[44px] touch-manipulation"
            >
              ›
            </button>
          </div>
          {loading ? (
            <div className="py-8 text-center text-sm text-charcoal/60">Loading…</div>
          ) : (
            <>
              <div className="calendar-grid">
                <span className="calendar-dow">Sun</span>
                <span className="calendar-dow">Mon</span>
                <span className="calendar-dow">Tue</span>
                <span className="calendar-dow">Wed</span>
                <span className="calendar-dow">Thu</span>
                <span className="calendar-dow">Fri</span>
                <span className="calendar-dow">Sat</span>
                {Array.from({ length: firstDay }, (_, i) => (
                  <span key={`e-${i}`} className="calendar-day calendar-day-empty" />
                ))}
                {days.map(({ dayNum, dateStr, isBooked, isPartial, isPast }) => {
                  const isClickable = !isBooked && !isPast && onSelectDate;
                  const dayClass = isPast
                    ? "calendar-day-past"
                    : isBooked
                      ? "calendar-day-booked"
                      : isPartial
                        ? "calendar-day-partial"
                        : "calendar-day-available";
                  return (
                    <span
                      key={`${year}-${month}-${dayNum}`}
                      role={isClickable ? "button" : undefined}
                      tabIndex={isClickable ? 0 : undefined}
                      onClick={isClickable ? () => onSelectDate!(dateStr) : undefined}
                      onKeyDown={isClickable ? (e) => e.key === "Enter" && onSelectDate!(dateStr) : undefined}
                      className={`calendar-day ${dayClass} ${isClickable ? "cursor-pointer hover:ring-2 hover:ring-gold hover:ring-offset-1" : ""} ${isPast ? "calendar-day-disabled" : ""}`}
                      title={
                        isPast
                          ? "Past dates cannot be selected"
                          : isBooked
                            ? "Fully booked"
                            : isPartial
                              ? "Some time slots still available — click to choose"
                              : isClickable
                                ? "Select this date"
                                : "Available"
                      }
                    >
                      {dayNum}
                    </span>
                  );
                })}
              </div>
              <div className="calendar-legend">
                <span className="legend-item"><i className="legend-available" aria-hidden /> Available</span>
                <span className="legend-item"><i className="legend-partial" aria-hidden /> Some slots left</span>
                <span className="legend-item"><i className="legend-booked" aria-hidden /> Full</span>
              </div>
              {compact && onSelectDate && openDates.length > 0 ? (
                <div className="contact-open-dates">
                  <p className="contact-open-dates-label">Open dates coming up</p>
                  <div className="contact-open-dates-chips">
                    {openDates.filter((ds) => ds >= todayStr).map((ds) => (
                      <button
                        key={ds}
                        type="button"
                        className="contact-open-date-chip"
                        onClick={() => onSelectDate!(ds)}
                      >
                        {new Date(ds + "T12:00:00").toLocaleDateString("en-GB", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          )}
    </div>
  );

  if (compact) return content;
  return (
    <section className="venue-calendar-section" aria-label="Venue availability">
      <div className="container">
        <p className="section-label text-gold">Availability</p>
        <h2 className="section-heading">Check our calendar</h2>
        <p className="calendar-intro">
          Fully booked dates are greyed out. Gold-tinted days still have free time slots — pick a date, then choose your preferred slot below.
        </p>
        {content}
      </div>
    </section>
  );
}
