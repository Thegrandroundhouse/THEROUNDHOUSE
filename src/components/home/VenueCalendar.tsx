"use client";

import { useState } from "react";

// Placeholder: in production, fetch from Supabase venue_calendar for the month
const getDaysInMonth = (year: number, month: number) => {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const days: { date: Date; isBooked: boolean }[] = [];
  for (let d = 1; d <= last.getDate(); d++) {
    days.push({
      date: new Date(year, month, d),
      isBooked: false, // TODO: from Supabase
    });
  }
  return days;
};

const MONTHS = "January February March April May June July August September October November December".split(" ");

export default function VenueCalendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const days = getDaysInMonth(year, month);
  const firstDay = new Date(year, month, 1).getDay();

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

  return (
    <section className="venue-calendar-section" aria-label="Venue availability">
      <div className="container">
        <p className="section-label">Availability</p>
        <h2 className="section-heading">View our calendar</h2>
        <p className="calendar-intro">
          See which dates are booked. Contact us to check availability and pricing for your date.
        </p>
        <div className="calendar-widget">
          <div className="calendar-header">
            <button type="button" onClick={prevMonth} aria-label="Previous month">
              ‹
            </button>
            <span className="calendar-title">
              {MONTHS[month]} {year}
            </span>
            <button type="button" onClick={nextMonth} aria-label="Next month">
              ›
            </button>
          </div>
          <div className="calendar-grid">
            <span className="calendar-dow">Sun</span>
            <span className="calendar-dow">Mon</span>
            <span className="calendar-dow">Tue</span>
            <span className="calendar-dow">Wed</span>
            <span className="calendar-dow">Thu</span>
            <span className="calendar-dow">Fri</span>
            <span className="calendar-dow">Sat</span>
            {Array.from({ length: firstDay }, (_, i) => (
              <span key={`empty-${i}`} className="calendar-day calendar-day-empty" />
            ))}
            {days.map(({ date, isBooked }) => (
              <span
                key={date.toISOString()}
                className={`calendar-day ${isBooked ? "calendar-day-booked" : "calendar-day-available"}`}
                title={isBooked ? "Booked" : "Available"}
              >
                {date.getDate()}
              </span>
            ))}
          </div>
          <div className="calendar-legend">
            <span className="legend-item"><i className="legend-available" /> Available</span>
            <span className="legend-item"><i className="legend-booked" /> Booked</span>
          </div>
        </div>
      </div>
    </section>
  );
}
