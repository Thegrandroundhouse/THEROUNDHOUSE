"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-api-client";

export type AvailabilityPayload = {
  dateManuallyBlocked: boolean;
  slotsEnabled: boolean;
  wholeDayMode: boolean;
  hasWholeDayBooking: boolean;
  slots: { key: string; label: string; timeLabel: string; available: boolean; booked: number; max: number }[];
  dateFullyBooked: boolean;
  availableSlotKeys: string[];
  advisories: string[];
};

export function AdminDateAvailabilityAdvisory({
  date,
  excludeBookingId,
  selectedSlotKey,
  /** What this booking holds — shown above the slot list (e.g. on booking detail overview). */
  thisBookingHolds,
}: {
  date: string;
  excludeBookingId?: string | null;
  /** Current slot choice — if set and unavailable, extra warning */
  selectedSlotKey?: string | null;
  thisBookingHolds?: {
    mode: "whole_day" | "slot";
    slotKey?: string;
    label: string;
    timeLabel?: string;
  } | null;
}) {
  const [data, setData] = useState<AvailabilityPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setData(null);
      setFetchError(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setFetchError(false);
    const q = new URLSearchParams({ date });
    if (excludeBookingId) q.set("exclude_booking_id", excludeBookingId);
    adminFetch(`/api/admin/availability-for-date?${q}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: AvailabilityPayload | null) => {
        if (!cancelled) {
          setData(d);
          if (!d) setFetchError(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
          setFetchError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date, excludeBookingId, reloadToken]);

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (loading && !data) {
    return (
      <div className="admin-availability-advisory admin-availability-advisory--loading" aria-live="polite">
        Checking availability for this date…
      </div>
    );
  }
  if (fetchError && !data) {
    return (
      <div className="admin-availability-advisory admin-availability-advisory--warn" role="alert">
        <p className="admin-availability-advisory-msg" style={{ marginBottom: "0.5rem" }}>
          Couldn’t load availability for this date.
        </p>
        <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setReloadToken((t) => t + 1)}>
          Refresh
        </button>
      </div>
    );
  }
  if (!data) return null;

  const slotUnavailable =
    data.slotsEnabled &&
    selectedSlotKey &&
    data.slots.some((s) => s.key === selectedSlotKey && !s.available);

  const severity =
    data.dateManuallyBlocked || data.dateFullyBooked
      ? "danger"
      : slotUnavailable || data.advisories.length
        ? "warn"
        : "ok";

  const isWhole = thisBookingHolds?.mode === "whole_day";

  return (
    <div
      className={`admin-availability-advisory admin-availability-advisory--${severity}`}
      role="region"
      aria-label="Date availability"
    >
      {thisBookingHolds ? (
        <div
          className={`admin-availability-this-booking ${isWhole ? "admin-availability-this-booking--whole" : "admin-availability-this-booking--slot"}`}
        >
          <span className="admin-availability-this-booking-kicker">This booking holds</span>
          {isWhole ? (
            <>
              <strong className="admin-availability-this-booking-title">Full venue · whole day</strong>
              <span className="admin-availability-this-booking-detail">Entire date — blocks every time slot</span>
            </>
          ) : (
            <>
              <strong className="admin-availability-this-booking-title">{thisBookingHolds.label} slot</strong>
              {thisBookingHolds.timeLabel ? (
                <span className="admin-availability-this-booking-detail">{thisBookingHolds.timeLabel}</span>
              ) : null}
              <span className="admin-availability-this-booking-hint">Other slots on this date may still be bookable</span>
            </>
          )}
        </div>
      ) : null}

      {data.dateManuallyBlocked ? (
        <p className="admin-availability-advisory-title">Date not available</p>
      ) : data.wholeDayMode ? (
        <p className="admin-availability-advisory-title">
          {data.dateFullyBooked ? "Date already booked (whole venue)" : "Date free (whole venue)"}
        </p>
      ) : data.dateFullyBooked ? (
        <p className="admin-availability-advisory-title">All time slots booked</p>
      ) : (
        <p className="admin-availability-advisory-title">Availability on this date</p>
      )}

      {data.advisories.map((a, i) => (
        <p key={i} className="admin-availability-advisory-msg">
          {a}
        </p>
      ))}

      {slotUnavailable ? (
        <p className="admin-availability-advisory-msg">
          <strong>Selected slot is full</strong> — pick another slot or date before saving.
        </p>
      ) : null}

      {data.slotsEnabled && data.slots.length > 0 && thisBookingHolds?.mode === "whole_day" ? (
        <>
          <p className="admin-availability-advisory-msg admin-availability-advisory-msg--muted">
            Every band below is covered by this <strong>whole-day</strong> booking — the date is closed to other slot bookings.
          </p>
          <ul className="admin-availability-slots">
            {data.slots.map((s) => (
              <li key={s.key} className="admin-availability-slot--full admin-availability-slot--yours">
                <div className="admin-availability-slot-left">
                  <span className="admin-availability-slot-label">
                    {s.label}
                    {s.timeLabel ? ` (${s.timeLabel})` : ""}
                  </span>
                  <span className="admin-availability-slot-yours-badge">Whole-day booking</span>
                </div>
                <span className="admin-availability-slot-meta">Reserved</span>
              </li>
            ))}
          </ul>
        </>
      ) : data.slotsEnabled && data.slots.length > 0 ? (
        <ul className="admin-availability-slots">
          {data.slots.map((s) => {
            const isYours = thisBookingHolds?.mode === "slot" && thisBookingHolds.slotKey === s.key;
            return (
              <li
                key={s.key}
                className={`${s.available ? "admin-availability-slot--free" : "admin-availability-slot--full"}${isYours ? " admin-availability-slot--yours" : ""}`}
              >
                <div className="admin-availability-slot-left">
                  <span className="admin-availability-slot-label">
                    {s.label}
                    {s.timeLabel ? ` (${s.timeLabel})` : ""}
                  </span>
                  {isYours ? <span className="admin-availability-slot-yours-badge">This booking</span> : null}
                </div>
                <span className="admin-availability-slot-meta">
                  {isYours ? (
                    <>
                      {s.max <= 1 ? (
                        <>Held by this booking</>
                      ) : (() => {
                          const others = s.booked;
                          const more = s.max - others - 1;
                          if (more <= 0)
                            return <>Held by this booking · band full ({others + 1}/{s.max})</>;
                          return (
                            <>
                              Held by this booking · room for {more} more {more === 1 ? "booking" : "bookings"} here
                            </>
                          );
                        })()}
                    </>
                  ) : s.available ? (
                    <>Available ({s.max - s.booked} left)</>
                  ) : (
                    <>Full ({s.booked}/{s.max})</>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      ) : data.wholeDayMode && !data.dateFullyBooked ? (
        <p className="admin-availability-advisory-msg admin-availability-advisory-msg--muted">
          No other bookings on this date — safe for a whole-venue event.
        </p>
      ) : null}
    </div>
  );
}
