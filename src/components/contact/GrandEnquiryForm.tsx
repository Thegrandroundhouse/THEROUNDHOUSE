"use client";

import { useState, useEffect, useMemo } from "react";
import { minSelectableEventDateYYYYMMDD } from "@/lib/min-event-date";

const FUNCTION_TYPES = ["Wedding", "Engagement", "Mehndi Night", "Reception", "Birthday", "Corporate", "Anniversary", "Other"];
const SOURCES = ["Google Search", "Instagram", "Facebook", "Word of Mouth", "Wedding Fair", "Other"];

type SlotRow = { key: string; label: string; timeLabel: string; available: boolean; booked: number; max: number };

type GrandEnquiryFormProps = { selectedDate?: string; onDateClear?: () => void; onDatePicked?: (dateStr: string) => void };

export function GrandEnquiryForm({ selectedDate = "", onDateClear, onDatePicked }: GrandEnquiryFormProps = {}) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");
  const [form, setForm] = useState({
    typeOfFunction: "",
    whereDidYouHear: "",
    name: "",
    email: "",
    phone: "",
    date: selectedDate,
    event_slot_key: "",
    message: "",
  });
  const [slotsState, setSlotsState] = useState<{
    enabled: boolean;
    slots: SlotRow[];
    loading: boolean;
    wholeDayAvailable: boolean;
    wholeDayLabel: string;
  }>({
    enabled: false,
    slots: [],
    loading: false,
    wholeDayAvailable: false,
    wholeDayLabel: "Full venue (whole day)",
  });
  const [altOpenDates, setAltOpenDates] = useState<string[]>([]);

  const dateValue = form.date || selectedDate;

  useEffect(() => {
    if (selectedDate) setForm((f) => ({ ...f, date: selectedDate }));
  }, [selectedDate]);

  useEffect(() => {
    if (!dateValue || !/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      setSlotsState({
        enabled: false,
        slots: [],
        loading: false,
        wholeDayAvailable: false,
        wholeDayLabel: "Full venue (whole day)",
      });
      setForm((f) => ({ ...f, event_slot_key: "" }));
      return;
    }
    setSlotsState((s) => ({ ...s, loading: true }));
    fetch(`/api/booking-slots?date=${dateValue}`)
      .then((r) => r.json())
      .then(
        (d: {
          enabled?: boolean;
          slots?: SlotRow[];
          wholeDayAvailable?: boolean;
          allowWholeDay?: boolean;
          wholeDayLabel?: string;
        }) => {
          const slots = d.slots ?? [];
          const wda = !!d.wholeDayAvailable && d.allowWholeDay !== false;
          const label = (typeof d.wholeDayLabel === "string" && d.wholeDayLabel.trim()) ? d.wholeDayLabel.trim() : "Full venue (whole day)";
          const baseEnabled = d.enabled === true && slots.length > 0;
          const showTimePicker = baseEnabled || wda;
          setSlotsState({
            enabled: showTimePicker,
            slots,
            loading: false,
            wholeDayAvailable: wda,
            wholeDayLabel: label,
          });
          setForm((f) => {
            if (!showTimePicker) return { ...f, event_slot_key: "" };
            if (wda) {
              if (!f.event_slot_key || f.event_slot_key === "whole_day") {
                return { ...f, event_slot_key: "whole_day" };
              }
              const slotStillOk = slots.some((x) => x.key === f.event_slot_key && x.available);
              if (slotStillOk) return f;
              return { ...f, event_slot_key: "whole_day" };
            }
            const firstFree = slots.find((x) => x.available);
            const stillOk = slots.some((x) => x.key === f.event_slot_key && x.available);
            if (stillOk) return f;
            return { ...f, event_slot_key: firstFree?.key ?? "" };
          });
        }
      )
      .catch(() =>
        setSlotsState({
          enabled: false,
          slots: [],
          loading: false,
          wholeDayAvailable: false,
          wholeDayLabel: "Full venue (whole day)",
        })
      );
  }, [dateValue]);

  useEffect(() => {
    if (!slotsState.enabled || !dateValue || slotsState.loading) {
      setAltOpenDates([]);
      return;
    }
    const noSlotFree = slotsState.slots.every((s) => !s.available);
    if (!noSlotFree || slotsState.wholeDayAvailable) {
      setAltOpenDates([]);
      return;
    }
    fetch("/api/availability/open-dates?limit=10")
      .then((r) => r.json())
      .then((d: { dates?: string[] }) => setAltOpenDates(Array.isArray(d.dates) ? d.dates : []))
      .catch(() => setAltOpenDates([]));
  }, [slotsState.enabled, slotsState.slots, slotsState.loading, slotsState.wholeDayAvailable, dateValue]);

  const minDate = useMemo(() => minSelectableEventDateYYYYMMDD(), []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrMsg("");
    if (dateValue && /^\d{4}-\d{2}-\d{2}$/.test(dateValue) && dateValue < minDate) {
      setErrMsg("Please choose today or a future date.");
      setStatus("error");
      return;
    }
    const payload: Record<string, unknown> = { ...form, date: dateValue };
    if (slotsState.enabled) {
      if (form.event_slot_key === "whole_day" && slotsState.wholeDayAvailable) {
        payload.event_slot_key = "whole_day";
      } else if (form.event_slot_key && form.event_slot_key !== "whole_day") {
        payload.event_slot_key = form.event_slot_key;
      } else {
        delete payload.event_slot_key;
      }
    } else delete payload.event_slot_key;
    try {
      const res = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrMsg(typeof data.error === "string" ? data.error : "Please check the form and try again.");
        setStatus("error");
        return;
      }
      setStatus("success");
      setForm({ typeOfFunction: "", whereDidYouHear: "", name: "", email: "", phone: "", date: "", event_slot_key: "", message: "" });
      onDateClear?.();
    } catch {
      setStatus("error");
      setErrMsg("Something went wrong. Please try again or call us.");
    }
  }

  const inputClass =
    "mt-2 w-full min-h-[50px] rounded-xl border border-charcoal/12 bg-[#faf9f6] px-4 py-3.5 text-base text-charcoal transition placeholder:text-charcoal/40 focus:border-gold focus:bg-white focus:outline-none focus:ring-2 focus:ring-gold/25 touch-manipulation sm:min-h-[48px] sm:rounded-lg sm:py-3.5";

  const hasSlotChoices = slotsState.wholeDayAvailable || slotsState.slots.some((s) => s.available);
  const hasValidTimePick =
    (slotsState.wholeDayAvailable && form.event_slot_key === "whole_day") ||
    slotsState.slots.some((s) => s.key === form.event_slot_key && s.available);

  return (
    <form onSubmit={handleSubmit} className="mt-6 w-full max-w-xl space-y-5 lg:max-w-none">
      <div>
        <label htmlFor="typeOfFunction" className="block text-sm font-medium text-charcoal/90">Type of function *</label>
        <select id="typeOfFunction" required value={form.typeOfFunction} onChange={(e) => setForm((f) => ({ ...f, typeOfFunction: e.target.value }))} className={inputClass}>
          <option value="">Select</option>
          {FUNCTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="whereDidYouHear" className="block text-sm font-medium text-charcoal">Where did you hear about us? *</label>
        <select id="whereDidYouHear" required value={form.whereDidYouHear} onChange={(e) => setForm((f) => ({ ...f, whereDidYouHear: e.target.value }))} className={inputClass}>
          <option value="">Select</option>
          {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-charcoal">Name *</label>
          <input id="name" type="text" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputClass} />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-charcoal/90">Email *</label>
          <input id="email" type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={inputClass} />
        </div>
      </div>
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-charcoal">Phone *</label>
        <input id="phone" type="tel" required value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className={inputClass} />
      </div>
      <div>
        <label htmlFor="date" className="block text-sm font-medium text-charcoal">Preferred date</label>
        <p className="mt-1 text-xs text-charcoal/60">Pick a date from the calendar or enter below.</p>
        <input
          id="date"
          type="date"
          min={minDate}
          value={dateValue}
          onChange={(e) => setForm((f) => ({ ...f, date: e.target.value, event_slot_key: "" }))}
          className={inputClass}
        />
      </div>

      {dateValue && slotsState.loading && <p className="text-sm text-charcoal/60">Loading availability…</p>}

      {dateValue && slotsState.enabled && !slotsState.loading && (
        <div>
          <span className="block text-sm font-medium text-charcoal">Preferred time *</span>
          <p className="mt-1 text-xs text-charcoal/60">
            {slotsState.wholeDayAvailable
              ? "Whole venue is available on this date — selected by default. You can choose a time slot instead if you prefer."
              : "Choose a slot that is still free on this date."}
          </p>
          <div className="mt-3 space-y-2">
            {slotsState.wholeDayAvailable ? (
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition touch-manipulation ${
                  form.event_slot_key === "whole_day"
                    ? "border-gold bg-gold/10 ring-2 ring-gold/30"
                    : "border-charcoal/12 bg-[#faf9f6] hover:border-gold/40"
                }`}
              >
                <input
                  type="radio"
                  name="event_slot"
                  className="mt-1"
                  checked={form.event_slot_key === "whole_day"}
                  onChange={() => setForm((f) => ({ ...f, event_slot_key: "whole_day" }))}
                />
                <span className="flex-1">
                  <span className="font-semibold text-charcoal">{slotsState.wholeDayLabel}</span>
                  <span className="mt-0.5 block text-xs text-charcoal/50">Exclusive use of the venue for the full day</span>
                </span>
              </label>
            ) : null}
            {slotsState.slots.map((s) => (
              <label
                key={s.key}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition touch-manipulation ${
                  s.available
                    ? form.event_slot_key === s.key
                      ? "border-gold bg-gold/10 ring-2 ring-gold/30"
                      : "border-charcoal/12 bg-[#faf9f6] hover:border-gold/40"
                    : "cursor-not-allowed border-charcoal/8 bg-charcoal/5 opacity-60"
                }`}
              >
                <input
                  type="radio"
                  name="event_slot"
                  className="mt-1"
                  disabled={!s.available}
                  checked={form.event_slot_key === s.key}
                  onChange={() => setForm((f) => ({ ...f, event_slot_key: s.key }))}
                />
                <span className="flex-1">
                  <span className="font-semibold text-charcoal">{s.label}</span>
                  {s.timeLabel ? <span className="ml-2 text-sm text-charcoal/65">{s.timeLabel}</span> : null}
                  <span className="mt-0.5 block text-xs text-charcoal/50">
                    {s.available ? `${s.max - s.booked} left` : "Full"}
                  </span>
                </span>
              </label>
            ))}
          </div>
          {slotsState.slots.every((s) => !s.available) && !slotsState.wholeDayAvailable && (
            <div className="mt-3 rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-3 text-sm text-amber-950">
              <p className="font-semibold">No free slots left on this date</p>
              <p className="mt-1 text-xs text-amber-900/85">
                Your enquiry can still save a preferred date for our team — or pick another day below. Confirmed bookings always follow availability.
              </p>
              {altOpenDates.length > 0 ? (
                <div className="mt-2">
                  <p className="text-xs font-medium text-amber-900/90">Dates with space:</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {altOpenDates.map((ds) => (
                      <button
                        key={ds}
                        type="button"
                        className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-charcoal shadow-sm ring-1 ring-amber-200/60 transition hover:ring-gold"
                        onClick={() => {
                          setForm((f) => ({ ...f, date: ds, event_slot_key: "" }));
                          onDatePicked?.(ds);
                        }}
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
            </div>
          )}
        </div>
      )}

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-charcoal">Message</label>
        <textarea id="message" rows={4} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} className={`${inputClass} min-h-[120px]`} />
      </div>
      {status === "success" && <p className="text-gold-dark">Thank you. We will be in touch shortly.</p>}
      {status === "error" && <p className="text-red-700">{errMsg || "Something went wrong. Please try again or call us."}</p>}
      <button
        type="submit"
        disabled={status === "loading" || (Boolean(dateValue) && slotsState.enabled && !slotsState.loading && hasSlotChoices && !hasValidTimePick)}
        className="btn-primary mt-8 min-h-[54px] w-full rounded-xl py-4 text-[0.8125rem] tracking-[0.2em] shadow-md transition active:scale-[0.99] touch-manipulation sm:mt-6 sm:min-h-[52px] sm:w-auto sm:rounded-sm sm:py-3.5 disabled:opacity-50"
      >
        {status === "loading" ? "Sending…" : "Send enquiry"}
      </button>
    </form>
  );
}
