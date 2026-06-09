"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Enquiry, EnquiryStatus } from "@/types/crm";
import { adminFetch, parseAdminError } from "@/lib/admin-api-client";
import { useAdminDialog } from "@/components/admin/AdminDialogContext";
import { DEFAULT_BOOKING_SLOTS } from "@/lib/booking-slots";
import { AdminDateAvailabilityAdvisory } from "@/components/admin/AdminDateAvailabilityAdvisory";

const STATUS_OPTIONS: EnquiryStatus[] = ["new", "contacted", "quoted", "converted", "lost"];
const STATUS_LABELS: Record<EnquiryStatus, string> = {
  new: "New",
  contacted: "Contacted",
  quoted: "Quoted",
  converted: "Converted",
  lost: "Lost",
};

function pillClass(s: EnquiryStatus) {
  return `admin-eq-pill--${s}`;
}

type SlotDef = { key: string; label: string; timeLabel: string };

type DateHoldRow = {
  id: string;
  hold_date: string;
  event_slot_key?: string | null;
  note?: string | null;
  expires_at?: string | null;
  enquiry_id?: string | null;
};

function BoxTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="admin-eqd-box-title">{children}</h2>;
}

export default function EnquiryDetailPage() {
  const { alert } = useAdminDialog();
  const params = useParams();
  const id = params.id as string;
  const [enquiry, setEnquiry] = useState<Enquiry | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [slotDefs, setSlotDefs] = useState<SlotDef[]>(DEFAULT_BOOKING_SLOTS.slots);
  const [form, setForm] = useState({
    status: "" as EnquiryStatus,
    notes: "",
    follow_up_notes: "",
    event_date: "",
    event_slot_key: "" as string | null,
  });
  const [holds, setHolds] = useState<DateHoldRow[]>([]);
  const [holdsLoading, setHoldsLoading] = useState(false);
  const [holdPlacing, setHoldPlacing] = useState(false);
  /** Hold uses its own date/time (slot) — not locked to enquiry fields */
  const [holdDate, setHoldDate] = useState("");
  const [holdScope, setHoldScope] = useState<"whole_day" | "slot">("whole_day");
  const [holdSlotKey, setHoldSlotKey] = useState<string>("");
  const [holdDurationHours, setHoldDurationHours] = useState(72);
  const [wholeDayAvailable, setWholeDayAvailable] = useState(false);
  const [allowWholeDaySetting, setAllowWholeDaySetting] = useState(true);

  const refreshHolds = () => {
    setHoldsLoading(true);
    adminFetch(`/api/admin/date-holds?enquiry_id=${id}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: DateHoldRow[]) => setHolds(Array.isArray(rows) ? rows : []))
      .catch(() => setHolds([]))
      .finally(() => setHoldsLoading(false));
  };

  useEffect(() => {
    refreshHolds();
  }, [id]);

  useEffect(() => {
    adminFetch("/api/admin/settings/booking-slots")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { slots?: SlotDef[]; allowWholeDay?: boolean } | null) => {
        if (d?.slots?.length) setSlotDefs(d.slots);
        else setSlotDefs(DEFAULT_BOOKING_SLOTS.slots);
        setAllowWholeDaySetting((d as { allowWholeDay?: boolean } | null)?.allowWholeDay !== false);
      })
      .catch(() => setSlotDefs(DEFAULT_BOOKING_SLOTS.slots));
  }, []);

  useEffect(() => {
    const d = form.event_date;
    if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      setWholeDayAvailable(false);
      return;
    }
    fetch(`/api/booking-slots?date=${d}`)
      .then((r) => r.json())
      .then((j: { wholeDayAvailable?: boolean; allowWholeDay?: boolean }) => {
        setWholeDayAvailable(!!j.wholeDayAvailable && j.allowWholeDay !== false);
      })
      .catch(() => setWholeDayAvailable(false));
  }, [form.event_date]);

  useEffect(() => {
    adminFetch(`/api/admin/enquiries/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Not found"))))
      .then((data: Enquiry) => {
        setEnquiry(data);
        const ed = data.event_date || "";
        const sk = data.event_slot_key ?? null;
        setForm({
          status: data.status,
          notes: data.notes || "",
          follow_up_notes: data.follow_up_notes || "",
          event_date: ed,
          event_slot_key: sk,
        });
        setHoldDate(ed);
        setHoldSlotKey(sk && sk !== "whole_day" ? sk : DEFAULT_BOOKING_SLOTS.slots[0]?.key ?? "");
      })
      .catch(() => setEnquiry(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (holdScope === "slot" && !holdSlotKey && slotDefs.length) {
      setHoldSlotKey(slotDefs[0].key);
    }
  }, [holdScope, slotDefs, holdSlotKey]);

  const save = async (extra?: { mark_contacted_now?: boolean }) => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await adminFetch(`/api/admin/enquiries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          event_date: form.event_date || null,
          event_slot_key: form.event_slot_key === "" || form.event_slot_key == null ? null : form.event_slot_key,
          ...extra,
        }),
      });
      if (!res.ok) throw new Error(await parseAdminError(res, "Couldn’t save enquiry"));
      const data = await res.json();
      setEnquiry(data);
      setForm((f) => ({
        ...f,
        event_date: data.event_date || "",
        event_slot_key: data.event_slot_key ?? null,
      }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      await alert(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await save();
  };

  const slotLabel = (key: string | null | undefined) => {
    if (!key) return null;
    if (key === "whole_day") return "Full venue (whole day)";
    const s = slotDefs.find((x) => x.key === key);
    return s ? `${s.label}${s.timeLabel ? ` · ${s.timeLabel}` : ""}` : key.replace(/_/g, " ");
  };

  const bookingUrl = useMemo(() => {
    if (!enquiry) return "";
    const p = new URLSearchParams();
    p.set("enquiry_id", enquiry.id);
    p.set("name", enquiry.name);
    p.set("email", enquiry.email);
    if (enquiry.phone) p.set("phone", enquiry.phone);
    const date = form.event_date || enquiry.event_date;
    if (date) p.set("date", date);
    if (enquiry.function_type) p.set("event_type", enquiry.function_type);
    const slot = form.event_slot_key ?? enquiry.event_slot_key;
    if (slot === "whole_day") p.set("whole_day", "1");
    else if (slot) p.set("event_slot_key", slot);
    if (enquiry.message?.trim()) p.set("message", enquiry.message.trim().slice(0, 2000));
    return `/admin/bookings/new?${p.toString()}`;
  }, [enquiry, form.event_date, form.event_slot_key]);

  const bookingUrlFullVenue = useMemo(() => {
    if (!bookingUrl) return "";
    const sep = bookingUrl.includes("?") ? "&" : "?";
    const p = new URLSearchParams(bookingUrl.split("?")[1] || "");
    p.delete("event_slot_key");
    p.set("whole_day", "1");
    return `/admin/bookings/new?${p.toString()}`;
  }, [bookingUrl]);

  const copyEnquiryDateToHold = () => {
    if (form.event_date) setHoldDate(form.event_date);
    if (form.event_slot_key) setHoldSlotKey(form.event_slot_key);
  };

  if (loading) {
    return (
      <div className="admin-eq admin-eqd-page">
        <div className="admin-eqd-hero-strip">
          <div className="admin-bk-skeleton-line admin-bk-skeleton-line--lg" style={{ maxWidth: "14rem" }} />
        </div>
        <div className="admin-eqd-box-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="admin-eqd-box admin-eqd-box--skeleton" />
          ))}
        </div>
      </div>
    );
  }

  if (!enquiry) {
    return (
      <div className="admin-eq">
        <div className="admin-page-banner">
          <header className="admin-eq-hero">
            <div>
              <Link href="/admin/enquiries" className="admin-bkd-back">← Enquiries</Link>
              <h1 className="admin-page-title admin-eq-title">Enquiry not found</h1>
            </div>
            <Link href="/admin/enquiries" className="admin-btn admin-btn-primary">All enquiries</Link>
          </header>
        </div>
      </div>
    );
  }

  const dateFormatted = form.event_date
    ? new Date(form.event_date + "T12:00:00").toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

  const holdCanPlace =
    !!holdDate &&
    (holdScope === "whole_day" || (holdScope === "slot" && !!holdSlotKey));

  return (
    <div className="admin-eq admin-eqd-page admin-eqd-page--v2">
      <div className="admin-eqd-hero-strip">
        <div className="admin-eqd-hero-strip-inner">
          <div className="admin-eqd-hero-main">
            <Link href="/admin/enquiries" className="admin-bkd-back admin-eqd-back">← Enquiries</Link>
            <div className="admin-eqd-hero-title-row">
              <h1 className="admin-page-title admin-eq-title">{enquiry.name}</h1>
              <span className={`admin-eq-pill ${pillClass(form.status)}`}>{STATUS_LABELS[form.status]}</span>
            </div>
            <p className="admin-eqd-hero-meta">
              <a href={`mailto:${enquiry.email}`}>{enquiry.email}</a>
              {enquiry.phone ? <> · <a href={`tel:${enquiry.phone}`}>{enquiry.phone}</a></> : null}
              <span className="admin-eqd-banner-meta-sep"> · </span>
              {enquiry.function_type || "—"}
              <span className="admin-eqd-banner-meta-sep"> · </span>
              Pref. {dateFormatted}
              {form.event_slot_key ? <> · {slotLabel(form.event_slot_key)}</> : null}
            </p>
          </div>
          <div className="admin-eqd-hero-ctas">
            <Link href={bookingUrl} className="admin-btn admin-btn-primary admin-eqd-cta-booking">
              Create booking (use date &amp; slot)
            </Link>
            {form.event_date || enquiry.event_date ? (
              <Link href={bookingUrlFullVenue} className="admin-btn admin-btn-ghost admin-btn-sm">
                Full venue / whole day
              </Link>
            ) : null}
            <a href={`mailto:${enquiry.email}`} className="admin-btn admin-btn-ghost admin-btn-sm admin-eqd-hero-email">Email lead</a>
          </div>
        </div>
      </div>

      {(form.event_date || enquiry.event_date) && enquiry.status !== "converted" ? (
        <div
          className="admin-eqd-slot-notice"
          style={{
            margin: "0 0 1rem",
            padding: "0.85rem 1.1rem",
            borderRadius: "12px",
            border: "1px solid rgba(199, 162, 89, 0.45)",
            background: "rgba(199, 162, 89, 0.1)",
            fontSize: "0.9rem",
            lineHeight: 1.45,
          }}
        >
          <strong>Secure the diary:</strong> A soft hold is not a confirmed booking.{" "}
          <Link href={bookingUrl} className="admin-link">
            Create a booking
          </Link>{" "}
          to take the slot (or choose <Link href={bookingUrlFullVenue} className="admin-link">full venue</Link> if the whole day
          is still free). On the booking form you can tick <strong>Full venue</strong> when the date is completely available.
        </div>
      ) : null}

      {saved ? <div className="admin-bkd-flash" role="status">Saved</div> : null}

      <form onSubmit={handleSave} className="admin-eqd-box-grid">
        <section className="admin-eqd-box">
          <BoxTitle>Contact &amp; message</BoxTitle>
          <dl className="admin-eqd-dl admin-eqd-dl--compact">
            <dt>Hear about</dt>
            <dd>{enquiry.hear_about || "—"}</dd>
            <dt>Submitted</dt>
            <dd className="admin-eqd-dd-muted">{new Date(enquiry.created_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</dd>
            <dt>Last contact</dt>
            <dd className="admin-eqd-dd-muted">{enquiry.last_contact_at ? new Date(enquiry.last_contact_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" }) : "—"}</dd>
          </dl>
          <div className="admin-eqd-scroll">
            <p className="admin-eqd-box-label">Their message</p>
            <div className="admin-eqd-message-scroll">{enquiry.message || "—"}</div>
          </div>
        </section>

        <section className="admin-eqd-box">
          <BoxTitle>Enquiry date &amp; slot</BoxTitle>
          <p className="admin-eqd-hint-sm admin-eqd-hint-above">Saved on the enquiry — pre-fills the booking form.</p>
          <div className="admin-form-group admin-form-group--tight">
            <label>Event date</label>
            <input
              type="date"
              className="admin-eqd-input"
              value={form.event_date}
              onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))}
            />
          </div>
          <div className="admin-form-group admin-form-group--tight">
            <label>Time slot</label>
            <select
              className="admin-eqd-input"
              value={
                form.event_slot_key == null || form.event_slot_key === ""
                  ? ""
                  : form.event_slot_key === "whole_day"
                    ? "whole_day"
                    : form.event_slot_key
              }
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  event_slot_key: e.target.value === "" ? null : e.target.value === "whole_day" ? "whole_day" : e.target.value,
                }))
              }
            >
              <option value="">Not specified</option>
              {allowWholeDaySetting && wholeDayAvailable ? (
                <option value="whole_day">Full venue (whole day) — day is free</option>
              ) : null}
              {slotDefs.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                  {s.timeLabel ? ` · ${s.timeLabel}` : ""}
                </option>
              ))}
            </select>
            {allowWholeDaySetting && form.event_date && !wholeDayAvailable ? (
              <p className="admin-eqd-hint-sm">Full venue only when nothing else is booked that day.</p>
            ) : null}
          </div>
          <div className="admin-eqd-advisory-scroll">
            {form.event_date ? <AdminDateAvailabilityAdvisory date={form.event_date} selectedSlotKey={form.event_slot_key} /> : <p className="admin-eqd-hint-sm">Pick a date for availability.</p>}
          </div>
        </section>

        <section className="admin-eqd-box admin-eqd-box--hold">
          <BoxTitle>Soft hold</BoxTitle>
          <p className="admin-eqd-hint-sm admin-eqd-hint-above">Choose any date and whole day or a specific slot — independent of the enquiry fields above.</p>
          <div className="admin-eqd-hold-grid">
            <div className="admin-form-group admin-form-group--tight">
              <label>Hold date</label>
              <input
                type="date"
                className="admin-eqd-input"
                value={holdDate}
                onChange={(e) => setHoldDate(e.target.value)}
              />
            </div>
            {form.event_date ? (
              <button type="button" className="admin-eqd-link-btn" onClick={copyEnquiryDateToHold}>
                Match enquiry date &amp; slot
              </button>
            ) : null}
            <div className="admin-form-group admin-form-group--tight">
              <label>Hold coverage</label>
              <div className="admin-eqd-hold-coverage">
                <label className="admin-eqd-radio">
                  <input type="radio" name="holdScope" checked={holdScope === "whole_day"} onChange={() => setHoldScope("whole_day")} />
                  Whole day
                </label>
                <label className="admin-eqd-radio">
                  <input type="radio" name="holdScope" checked={holdScope === "slot"} onChange={() => setHoldScope("slot")} />
                  One slot (time)
                </label>
              </div>
            </div>
            {holdScope === "slot" ? (
              <div className="admin-form-group admin-form-group--tight">
                <label>Slot / time</label>
                <select
                  className="admin-eqd-input"
                  value={holdSlotKey}
                  onChange={(e) => setHoldSlotKey(e.target.value)}
                >
                  {slotDefs.map((s) => (
                    <option key={s.key} value={s.key}>{s.label}{s.timeLabel ? ` · ${s.timeLabel}` : ""}</option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="admin-form-group admin-form-group--tight">
              <label>Duration</label>
              <select className="admin-eqd-input" value={holdDurationHours} onChange={(e) => setHoldDurationHours(Number(e.target.value))}>
                <option value={24}>24 hours</option>
                <option value={72}>3 days</option>
                <option value={168}>7 days</option>
                <option value={336}>14 days</option>
              </select>
            </div>
          </div>
          {holdsLoading ? <p className="admin-eqd-hint-sm">Loading holds…</p> : holds.length > 0 ? (
            <ul className="admin-eqd-hold-compact">
              {holds.map((h) => (
                <li key={h.id}>
                  <span>
                    {new Date(h.hold_date + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                    {h.event_slot_key ? ` · ${slotLabel(h.event_slot_key) || h.event_slot_key}` : " · whole day"}
                  </span>
                  <button
                    type="button"
                    className="admin-btn admin-btn-ghost admin-btn-sm"
                    disabled={holdPlacing}
                    onClick={async () => {
                      setHoldPlacing(true);
                      try {
                        const res = await adminFetch(`/api/admin/date-holds/${h.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ released: true }) });
                        if (!res.ok) throw new Error(await parseAdminError(res, "Couldn’t release hold"));
                        await refreshHolds();
                      } catch (e) {
                        await alert(e instanceof Error ? e.message : "Release failed");
                      } finally {
                        setHoldPlacing(false);
                      }
                    }}
                  >
                    Release
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="admin-eqd-hint-sm">No active hold for this enquiry.</p>
          )}
          <button
            type="button"
            className="admin-btn admin-btn-primary admin-btn-sm w-full admin-eqd-hold-place"
            disabled={holdPlacing || !holdCanPlace}
            onClick={async () => {
              setHoldPlacing(true);
              try {
                const res = await adminFetch("/api/admin/date-holds", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    hold_date: holdDate,
                    enquiry_id: id,
                    event_slot_key: holdScope === "slot" && holdSlotKey ? holdSlotKey : null,
                    duration_hours: holdDurationHours,
                    note: `Hold · ${enquiry.name}`,
                  }),
                });
                if (!res.ok) throw new Error(await parseAdminError(res, "Couldn’t place hold"));
                await refreshHolds();
              } catch (e) {
                await alert(e instanceof Error ? e.message : "Hold failed");
              } finally {
                setHoldPlacing(false);
              }
            }}
          >
            {holdPlacing ? "…" : "Place hold"}
          </button>
        </section>

        <section className="admin-eqd-box admin-eqd-box--pipeline">
          <BoxTitle>Pipeline &amp; notes</BoxTitle>
          <div className="admin-eqd-statuses admin-eqd-statuses--compact">
            {STATUS_OPTIONS.map((s) => (
              <button key={s} type="button" className={form.status === s ? "admin-eqd-status admin-eqd-status--on" : "admin-eqd-status"} onClick={() => setForm((f) => ({ ...f, status: s }))}>
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
          <div className="admin-form-group admin-form-group--tight">
            <label>Internal notes</label>
            <textarea className="admin-eqd-textarea" rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Private…" />
          </div>
          <div className="admin-form-group admin-form-group--tight">
            <label>Follow-up</label>
            <textarea className="admin-eqd-textarea" rows={2} value={form.follow_up_notes} onChange={(e) => setForm((f) => ({ ...f, follow_up_notes: e.target.value }))} placeholder="Calls…" />
          </div>
          <div className="admin-eqd-box-actions">
            <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" disabled={saving} onClick={() => save({ mark_contacted_now: true })}>
              Log contact
            </button>
            <button type="submit" className="admin-btn admin-btn-primary admin-btn-sm" disabled={saving}>
              {saving ? "…" : "Save"}
            </button>
          </div>
          <Link href={bookingUrl} className="admin-eqd-pipeline-booking">
            <span className="admin-eqd-pipeline-booking-label">Turn enquiry into booking</span>
            <span className="admin-eqd-pipeline-booking-sub">Opens new booking with name, email &amp; date pre-filled</span>
          </Link>
        </section>
      </form>
    </div>
  );
}
