"use client";

import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { BookingStatus } from "@/types/crm";
import { adminFetch, parseAdminError } from "@/lib/admin-api-client";
import { useAdminDialog } from "@/components/admin/AdminDialogContext";
import { minSelectableEventDateYYYYMMDD } from "@/lib/min-event-date";
import {
  BOOKING_COMPLETED_FUTURE_EVENT_MESSAGE,
  isEventDateInFutureLondon,
} from "@/lib/booking-status-rules";

const STATUS_OPTIONS: BookingStatus[] = ["pending", "confirmed", "cancelled", "completed"];

const WHOLE_DAY_KEY = "whole_day";

type Pkg = {
  id: string;
  name: string;
  base_price_cents: number | null;
  active?: boolean;
  event_slot_keys?: string[] | null;
};

type PriceSource = {
  source: "day_override" | "season" | null;
  suggested_total_cents: number | null;
  band?: { id: string; name: string; date_start: string; date_end: string } | null;
  note?: string | null;
};

function gbp(c: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(c / 100);
}

function poundsToCents(s: string): number | null {
  const t = s.trim().replace(/[^0-9.]/g, "");
  if (!t) return null;
  const n = parseFloat(t);
  if (Number.isNaN(n)) return null;
  return Math.round(n * 100);
}

function centsToPounds(c: number | null): string {
  if (c == null) return "";
  return (c / 100).toFixed(2);
}

function NewBookingForm() {
  const { alert } = useAdminDialog();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [packagesError, setPackagesError] = useState<string | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [packageId, setPackageId] = useState("");
  const [priceSource, setPriceSource] = useState<PriceSource | null>(null);
  const [slotConfig, setSlotConfig] = useState<{
    enabled: boolean;
    allowWholeDay: boolean;
    wholeDayLabel: string;
    slots: { key: string; label: string; timeLabel: string }[];
  }>({
    enabled: false,
    allowWholeDay: true,
    wholeDayLabel: "Full venue (whole day) — blocks every other slot on this date.",
    slots: [],
  });
  const [dateBookings, setDateBookings] = useState<
    { id: string; booking_code: string | null; client_name: string | null; event_slot_key: string | null; status: string }[]
  >([]);
  const [slotRows, setSlotRows] = useState<{ key: string; label: string; timeLabel: string; available: boolean }[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  /** Date has no bookings yet — full venue / whole day is allowed (multi-slot mode). */
  const [wholeDayAvailable, setWholeDayAvailable] = useState(false);
  const [wholeDay, setWholeDay] = useState(false);
  const [eventSlotKey, setEventSlotKey] = useState("");
  const [halls, setHalls] = useState<{ id: string; name: string }[]>([]);
  const [selectedHallIds, setSelectedHallIds] = useState<string[]>([]);
  const prefillSlotKey = useRef<string | null>(null);

  const slotsMultiMode = slotConfig.enabled && slotConfig.slots.length > 0;

  const [form, setForm] = useState({
    client_name: "",
    client_email: "",
    client_phone: "",
    client_address: "",
    event_date: "",
    event_type: "",
    package_name: "",
    status: "pending" as BookingStatus,
    total_pounds: "",
    deposit_pounds: "",
    balance_pounds: "",
    payment_received_pounds: "",
    sync_instalments: true,
    payment_received_label: "Payment",
    special_requirements: "",
    notes: "",
    enquiry_id: "",
  });

  useEffect(() => {
    adminFetch("/api/admin/spaces")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setHalls(Array.isArray(d) ? d.map((h: { id: string; name: string }) => ({ id: h.id, name: h.name })) : []))
      .catch(() => setHalls([]));
  }, []);

  useEffect(() => {
    adminFetch("/api/admin/settings/booking-slots")
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (d: {
          enabled?: boolean;
          allowWholeDay?: boolean;
          wholeDayLabel?: string;
          slots?: { key: string; label: string; timeLabel: string }[];
        } | null) => {
        if (d?.enabled && Array.isArray(d.slots) && d.slots.length) {
          setSlotConfig({
            enabled: true,
            slots: d.slots,
            allowWholeDay: d.allowWholeDay !== false,
            wholeDayLabel:
              typeof d.wholeDayLabel === "string" && d.wholeDayLabel.trim()
                ? d.wholeDayLabel.trim()
                : "Full venue (whole day) — blocks every other slot on this date.",
          });
        } else
          setSlotConfig({
            enabled: false,
            slots: [],
            allowWholeDay: true,
            wholeDayLabel: "Full venue (whole day) — blocks every other slot on this date.",
          });
      },
      )
      .catch(() =>
        setSlotConfig({
          enabled: false,
          slots: [],
          allowWholeDay: true,
          wholeDayLabel: "Full venue (whole day) — blocks every other slot on this date.",
        }),
      );
  }, []);

  useEffect(() => {
    if (!form.event_date || !slotsMultiMode) {
      setSlotRows([]);
      setEventSlotKey("");
      setWholeDay(false);
      setWholeDayAvailable(false);
      setSlotsLoading(false);
      return;
    }
    setSlotsLoading(true);
    setSlotsError(null);
    fetch(`/api/booking-slots?date=${form.event_date}`)
      .then((r) => {
        if (!r.ok) throw new Error("Couldn’t load slot availability");
        return r.json();
      })
      .then(
        (d: {
          slots?: { key: string; label: string; timeLabel: string; available: boolean }[];
          wholeDayAvailable?: boolean;
        }) => {
        const rows = d.slots ?? [];
        setSlotRows(rows);
        setWholeDayAvailable(!!d.wholeDayAvailable);
        const first = rows.find((x) => x.available);
        const pref = prefillSlotKey.current;
        setEventSlotKey(() => {
          if (pref && rows.some((x) => x.key === pref)) {
            const row = rows.find((x) => x.key === pref);
            if (row?.available) return pref;
            return first?.key ?? pref;
          }
          return first?.key ?? "";
        });
        if (!d.wholeDayAvailable) setWholeDay(false);
      },
      )
      .catch((err) => {
        setSlotRows([]);
        setSlotsError(err instanceof Error ? err.message : "Couldn’t load slot availability");
      })
      .finally(() => setSlotsLoading(false));
  }, [form.event_date, slotsMultiMode]);

  useEffect(() => {
    if (!form.event_date || !/^\d{4}-\d{2}-\d{2}$/.test(form.event_date)) {
      setDateBookings([]);
      return;
    }
    adminFetch(`/api/admin/bookings/by-date?date=${form.event_date}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { rows?: typeof dateBookings } | null) => setDateBookings(Array.isArray(d?.rows) ? d.rows : []))
      .catch(() => setDateBookings([]));
  }, [form.event_date]);

  const slotLabelFor = (key: string | null) => {
    if (key == null || String(key).trim() === "") return "Full venue";
    const s = slotConfig.slots.find((x) => x.key === key);
    return s ? s.label : key.replace(/_/g, " ");
  };

  const selectedPackage = useMemo(() => packages.find((p) => p.id === packageId), [packages, packageId]);
  const pkgSlotKeys = useMemo(() => {
    const k = selectedPackage?.event_slot_keys;
    return Array.isArray(k) && k.length
      ? k.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim())
      : [];
  }, [selectedPackage]);
  const pkgBandKeys = useMemo(() => pkgSlotKeys.filter((k) => k !== WHOLE_DAY_KEY), [pkgSlotKeys]);
  const packageHasSlotList = slotsMultiMode && pkgSlotKeys.length > 0;
  const packageAllowsWholeDay = !packageHasSlotList || pkgSlotKeys.includes(WHOLE_DAY_KEY);
  const packageDisallowsWholeDay = slotsMultiMode && pkgSlotKeys.length > 0 && !pkgSlotKeys.includes(WHOLE_DAY_KEY);
  const packageWholeDayOnly =
    slotsMultiMode && pkgSlotKeys.length > 0 && pkgBandKeys.length === 0 && pkgSlotKeys.includes(WHOLE_DAY_KEY);

  useEffect(() => {
    if (!packageDisallowsWholeDay) return;
    setWholeDay(false);
  }, [packageDisallowsWholeDay, packageId, form.event_date]);

  useEffect(() => {
    if (!slotConfig.allowWholeDay) setWholeDay(false);
  }, [slotConfig.allowWholeDay]);

  useEffect(() => {
    if (!packageHasSlotList || pkgBandKeys.length === 0 || !slotRows.length) return;
    setEventSlotKey((cur) => {
      const allowedAvail = slotRows.filter((r) => r.available && pkgBandKeys.includes(r.key));
      if (allowedAvail.some((r) => r.key === cur)) return cur;
      return allowedAvail[0]?.key ?? pkgBandKeys[0] ?? cur;
    });
  }, [packageHasSlotList, packageId, pkgBandKeys.join(","), JSON.stringify(slotRows.map((r) => [r.key, r.available]))]);

  useEffect(() => {
    setPackagesError(null);
    adminFetch("/api/admin/packages")
      .then(async (r) => {
        if (!r.ok) throw new Error(await parseAdminError(r, "Couldn’t load packages"));
        return r.json();
      })
      .then((list: Pkg[] | { rows?: Pkg[] }) => {
        const arr = Array.isArray(list) ? list : list?.rows ?? [];
        setPackages(arr.filter((p) => p.active !== false));
      })
      .catch((err) => {
        setPackages([]);
        setPackagesError(err instanceof Error ? err.message : "Couldn’t load packages");
      });
  }, []);

  useEffect(() => {
    const dateParam = searchParams.get("date");
    const eid = searchParams.get("enquiry_id") || "";
    const msg = searchParams.get("message");
    const et = searchParams.get("event_type");
    const sk = searchParams.get("event_slot_key");
    const wantWhole = searchParams.get("whole_day") === "1" || searchParams.get("whole_day") === "true";
    if (wantWhole) {
      prefillSlotKey.current = null;
    } else if (sk) {
      prefillSlotKey.current = sk;
    } else prefillSlotKey.current = null;

    setForm((f) => {
      const hasConvertedNote = String(f.notes || "").includes("Converted from enquiry");
      const next = {
        ...f,
        enquiry_id: eid || f.enquiry_id,
        client_name: searchParams.get("name")?.trim() || f.client_name,
        client_email: searchParams.get("email")?.trim() || f.client_email,
        client_phone: searchParams.get("phone")?.trim() || f.client_phone,
        event_date: dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : f.event_date,
        event_type: et?.trim() || f.event_type,
      };
      if (msg?.trim()) {
        next.special_requirements = msg.trim();
      }
      if (eid && !hasConvertedNote) {
        next.notes = [f.notes, `Converted from enquiry ${eid}.`].filter(Boolean).join("\n").trim();
      }
      return next;
    });
    if (wantWhole) setWholeDay(true);
    else if (sk) setWholeDay(false);
  }, [searchParams]);

  const fetchPriceForDate = useCallback((dateStr: string) => {
    if (!dateStr) {
      setPriceSource(null);
      setPriceError(null);
      return;
    }
    setPriceError(null);
    adminFetch(`/api/admin/pricing-for-date?date=${dateStr}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(await parseAdminError(r, "Couldn’t load suggested price"));
        return r.json();
      })
      .then((data: PriceSource | null) => {
        setPriceSource(data ?? null);
        if (data?.suggested_total_cents != null) {
          setForm((f) => (f.total_pounds ? f : { ...f, total_pounds: centsToPounds(data.suggested_total_cents!) }));
        }
      })
      .catch((err) => {
        setPriceSource(null);
        setPriceError(err instanceof Error ? err.message : "Couldn’t load suggested price");
      });
  }, []);

  useEffect(() => {
    if (form.event_date) fetchPriceForDate(form.event_date);
    else setPriceSource(null);
  }, [form.event_date, fetchPriceForDate]);

  const computedBalancePounds = useMemo(() => {
    const total = poundsToCents(form.total_pounds);
    const deposit = poundsToCents(form.deposit_pounds);
    if (total == null || deposit == null || total <= 0) return "";
    return centsToPounds(Math.max(0, total - deposit));
  }, [form.total_pounds, form.deposit_pounds]);

  useEffect(() => {
    if (!form.balance_pounds.trim() && computedBalancePounds) {
      setForm((f) => ({ ...f, balance_pounds: computedBalancePounds }));
    }
  }, [computedBalancePounds, form.balance_pounds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.client_email.trim()) {
      const msg = "Client email is required.";
      setFormError(msg);
      await alert(msg, { title: "Missing information" });
      return;
    }
    if (!form.event_date) {
      const msg = "Choose an event date.";
      setFormError(msg);
      await alert(msg, { title: "Missing information" });
      return;
    }
    if (slotsMultiMode && !wholeDay && !eventSlotKey) {
      const msg = "Choose a time slot, or tick full venue (whole day).";
      setFormError(msg);
      await alert(msg, { title: "Time slot required" });
      return;
    }
    if (packageHasSlotList) {
      if (wholeDay && !packageAllowsWholeDay) {
        await alert("This package is tied to specific time slots — uncheck whole venue and pick a matching slot.");
        return;
      }
      if (!wholeDay && packageWholeDayOnly) {
        await alert("This package is full venue only — tick full venue (whole day).");
        return;
      }
      if (!wholeDay && pkgBandKeys.length > 0 && !pkgBandKeys.includes(eventSlotKey)) {
        await alert("Pick a time slot that matches this package.");
        return;
      }
    }
    if (form.status === "completed" && isEventDateInFutureLondon(form.event_date)) {
      await alert(BOOKING_COMPLETED_FUTURE_EVENT_MESSAGE, { title: "Can’t create as completed" });
      return;
    }
    const total_cents = poundsToCents(form.total_pounds);
    const deposit_cents = poundsToCents(form.deposit_pounds);
    const balance_cents = poundsToCents(form.balance_pounds || computedBalancePounds);
    const payment_received_cents = poundsToCents(form.payment_received_pounds);
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
          client_name: form.client_name || null,
          client_email: form.client_email,
          client_phone: form.client_phone || null,
          client_address: form.client_address.trim() || null,
          event_date: form.event_date,
          event_type: form.event_type || null,
          package_name: form.package_name || null,
          package_id: packageId || null,
          status: form.status,
          total_cents,
          deposit_cents,
          balance_cents,
          record_deposit_received:
            payment_received_cents != null &&
            payment_received_cents > 0 &&
            deposit_cents != null &&
            payment_received_cents === deposit_cents,
          payment_received_cents:
            payment_received_cents && payment_received_cents > 0 ? payment_received_cents : null,
          payment_received_label: form.payment_received_label,
          sync_milestones: form.sync_instalments && !!payment_received_cents && payment_received_cents > 0,
          special_requirements: form.special_requirements || null,
          notes: form.notes || null,
          enquiry_id: form.enquiry_id || null,
          space_ids: selectedHallIds.length ? selectedHallIds : undefined,
      };
      if (slotsMultiMode) {
        if (wholeDay) {
          body.whole_day = true;
        } else {
          body.event_slot_key = eventSlotKey;
        }
      }
      const res = await adminFetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await parseAdminError(res, "Couldn’t create booking"));
      const data = (await res.json()) as { id: string };
      router.push(`/admin/bookings/${data.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Couldn’t create booking";
      setFormError(msg);
      await alert(msg, { title: "Couldn’t create booking" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-bk">
      <div className="admin-page-banner">
        <header className="admin-bk-hero">
          <div className="admin-bk-hero-text">
            <Link href="/admin/bookings" className="admin-bkd-back">
              ← Bookings
            </Link>
            <p className="admin-dash-kicker">Events & sales</p>
            <h1 className="admin-page-title admin-bk-title">Create booking</h1>
            <p className="admin-lead admin-bk-lead">
              Client details, date, slot, and payment — keep it simple.
            </p>
          </div>
          <div className="admin-bk-hero-actions">
            <Link href="/admin/bookings" className="admin-btn admin-btn-ghost">
              Cancel
            </Link>
            <button type="submit" form="admin-new-booking-form" className="admin-btn admin-btn-primary" disabled={saving}>
              {saving ? "Creating…" : "Create booking"}
            </button>
          </div>
        </header>
      </div>

      <form id="admin-new-booking-form" onSubmit={handleSubmit} className="admin-unified-layout">
        {formError ? (
          <div className="admin-pay-banner" style={{ background: "#fee2e2", borderColor: "#ef4444" }} role="alert">
            {formError}
          </div>
        ) : null}
        {packagesError ? (
          <div className="admin-pay-banner" style={{ background: "#fef3c7", borderColor: "#f59e0b" }} role="status">
            {packagesError} — you can still create a booking without a catalog package.
          </div>
        ) : null}
        <section className="admin-card admin-bk-simple-card">
          <h2 className="admin-section-title">Who is the client?</h2>
          <div className="admin-form-grid admin-bk-simple-grid">
            <div className="admin-form-group">
              <label>Name</label>
              <input className="admin-bk-simple-input" value={form.client_name} onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))} placeholder="Full name" />
            </div>
            <div className="admin-form-group">
              <label>Email *</label>
              <input className="admin-bk-simple-input" type="email" required value={form.client_email} onChange={(e) => setForm((f) => ({ ...f, client_email: e.target.value }))} placeholder="email@example.com" />
            </div>
            <div className="admin-form-group admin-form-full">
              <label>Phone</label>
              <input className="admin-bk-simple-input" type="tel" value={form.client_phone} onChange={(e) => setForm((f) => ({ ...f, client_phone: e.target.value }))} placeholder="07…" />
            </div>
            <div className="admin-form-group admin-form-full">
              <label>Address</label>
              <textarea
                className="admin-bk-simple-input"
                rows={2}
                value={form.client_address}
                onChange={(e) => setForm((f) => ({ ...f, client_address: e.target.value }))}
                placeholder="Client address — appears on the hire contract PDF"
              />
            </div>
          </div>
        </section>

        {halls.length > 0 ? (
          <section className="admin-card admin-bk-simple-card">
            <h2 className="admin-section-title">Which hall(s)?</h2>
            <p className="admin-bkd-quick-lead" style={{ marginBottom: "0.75rem" }}>
              Pick one hall, both, or leave blank for whole venue. Manage names in{" "}
              <Link href="/admin/settings?tab=halls" className="admin-link">
                Settings → Halls
              </Link>
              .
            </p>
            <div className="admin-bkd-statuses">
              {halls.map((h) => {
                const on = selectedHallIds.includes(h.id);
                return (
                  <button
                    key={h.id}
                    type="button"
                    className={on ? "admin-bkd-status admin-bkd-status--on" : "admin-bkd-status"}
                    onClick={() =>
                      setSelectedHallIds((prev) =>
                        on ? prev.filter((id) => id !== h.id) : [...prev, h.id],
                      )
                    }
                  >
                    {h.name}
                  </button>
                );
              })}
              {halls.length > 1 ? (
                <button
                  type="button"
                  className={
                    selectedHallIds.length === halls.length
                      ? "admin-bkd-status admin-bkd-status--on"
                      : "admin-bkd-status"
                  }
                  onClick={() => setSelectedHallIds(halls.map((h) => h.id))}
                >
                  Both halls
                </button>
              ) : null}
            </div>
          </section>
        ) : null}

        <section className="admin-card admin-bk-simple-card">
          <h2 className="admin-section-title">Event date &amp; slot</h2>
          <p className="admin-bk-simple-lead">Pick the date, then choose whole venue or a time slot.</p>
          <div className="admin-form-grid admin-bk-simple-grid">
            <div className="admin-form-group admin-form-full">
              <label>Event date *</label>
              <input
                className="admin-bk-simple-input"
                type="date"
                required
                min={minSelectableEventDateYYYYMMDD()}
                value={form.event_date}
                onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))}
              />
            </div>
            <div className="admin-form-group admin-form-full">
              <label>Package (optional)</label>
              <select
                className="admin-bk-simple-input"
                value={packageId}
                onChange={(e) => {
                  const pid = e.target.value;
                  setPackageId(pid);
                  const p = packages.find((x) => x.id === pid);
                  if (p) {
                    setForm((f) => ({
                      ...f,
                      package_name: p.name,
                      total_pounds: p.base_price_cents != null ? centsToPounds(p.base_price_cents) : f.total_pounds,
                    }));
                  }
                }}
              >
                <option value="">— No package —</option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.base_price_cents != null ? ` (${gbp(p.base_price_cents)})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!form.event_date ? (
            <p className="admin-bk-slot-hint">Choose a date above to see which slots are free.</p>
          ) : null}

          {!slotsMultiMode && form.event_date ? (
            <div className="admin-bk-slot-banner admin-bk-slot-banner--ok">
              <strong>Whole venue for the day</strong>
              <p>Only one booking per date. Cancelled bookings do not block the date.</p>
            </div>
          ) : null}

          {slotsMultiMode && form.event_date ? (
            <div className="admin-bk-slot-panel">
              {slotsError ? (
                <p className="admin-bk-slot-error" role="alert">
                  {slotsError}
                </p>
              ) : null}
              {slotConfig.allowWholeDay ? (
                <label className={`admin-bk-whole-pick-row ${packageDisallowsWholeDay || !wholeDayAvailable ? "admin-bk-whole-pick-row--disabled" : ""}`}>
                  <input
                    type="checkbox"
                    className="admin-bk-whole-pick-checkbox"
                    checked={wholeDay}
                    disabled={packageDisallowsWholeDay || !wholeDayAvailable}
                    onChange={(e) => {
                      const w = e.target.checked;
                      setWholeDay(w);
                      if (w) setEventSlotKey("");
                      else {
                        const rows =
                          packageHasSlotList && pkgBandKeys.length > 0
                            ? slotRows.filter((x) => pkgBandKeys.includes(x.key))
                            : slotRows;
                        const f = rows.find((x) => x.available);
                        setEventSlotKey(f?.key ?? "");
                      }
                    }}
                  />
                  <span className="admin-bk-whole-pick-label">
                    <span className="admin-bk-whole-pick-label-main">Full venue (whole day)</span>
                    {!wholeDayAvailable ? (
                      <span className="admin-bk-whole-pick-label-hint">Date already has a booking — pick a slot below</span>
                    ) : null}
                  </span>
                </label>
              ) : null}
              {dateBookings.length > 0 ? (
                <div className="admin-bk-date-bookings admin-bk-date-bookings--simple">
                  <strong>Already booked on this date</strong>
                  <ul>
                    {dateBookings.map((b) => (
                      <li key={b.id}>
                        <Link href={`/admin/bookings/${b.id}`} className="admin-link">
                          {b.booking_code || b.client_name || "Booking"}
                        </Link>
                        {" · "}
                        {slotLabelFor(b.event_slot_key)} · {b.status}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {!wholeDay ? (
                slotsLoading ? (
                  <p className="admin-bk-slot-hint">Loading slots…</p>
                ) : (
                  <div className="admin-bk-slot-grid" role="group" aria-label="Choose time slot">
                    {slotRows.map((s) => {
                      const slotAllowed = !packageHasSlotList || pkgBandKeys.includes(s.key);
                      const canPick = s.available && slotAllowed;
                      return (
                        <button
                          key={s.key}
                          type="button"
                          disabled={!canPick}
                          onClick={() => canPick && setEventSlotKey(s.key)}
                          className={`admin-bk-slot-card ${eventSlotKey === s.key ? "admin-bk-slot-card--selected" : ""} ${!s.available ? "admin-bk-slot-card--full" : ""}`}
                        >
                          <span className="admin-bk-slot-card-name">{s.label}</span>
                          {s.timeLabel ? <span className="admin-bk-slot-card-time">{s.timeLabel}</span> : null}
                          <span className={`admin-bk-slot-card-badge ${!s.available ? "admin-bk-slot-card-badge--full" : ""}`}>
                            {!slotAllowed ? "Wrong package" : s.available ? "Free" : "Taken"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="admin-card admin-bk-simple-card">
          <h2 className="admin-section-title">Payment</h2>
          <p className="admin-bk-simple-lead">How much is the booking worth, and did they pay anything today?</p>
          <div className="admin-form-grid admin-bk-simple-grid">
            <div className="admin-form-group">
              <label>Contract total (£)</label>
              <input
                className="admin-bk-simple-input"
                type="text"
                inputMode="decimal"
                value={form.total_pounds}
                onChange={(e) => setForm((f) => ({ ...f, total_pounds: e.target.value }))}
                placeholder="e.g. 5000.00"
              />
            </div>
            <div className="admin-form-group">
              <label>Money received today (£)</label>
              <input
                className="admin-bk-simple-input"
                type="text"
                inputMode="decimal"
                value={form.payment_received_pounds}
                onChange={(e) => setForm((f) => ({ ...f, payment_received_pounds: e.target.value }))}
                placeholder="Leave blank if none yet"
              />
            </div>
          </div>
          {form.event_date && priceSource?.suggested_total_cents != null && !priceError ? (
            <p className="admin-bk-slot-hint">
              Suggested price for this date: <strong>{gbp(priceSource.suggested_total_cents)}</strong>
              {" "}
              <button
                type="button"
                className="admin-btn admin-btn-ghost admin-btn-sm"
                onClick={() => setForm((f) => ({ ...f, total_pounds: centsToPounds(priceSource.suggested_total_cents) }))}
              >
                Use this
              </button>
            </p>
          ) : null}
        </section>

        <details className="admin-card admin-bk-more-details" open>
          <summary className="admin-bk-more-summary">More options — notes, deposit, status…</summary>

        <section className="admin-card admin-bk-more-inner">
          <h2 className="admin-section-title">Extra details</h2>
          <div className="admin-form-grid">
            <div className="admin-form-group">
              <label>Event type</label>
              <input value={form.event_type} onChange={(e) => setForm((f) => ({ ...f, event_type: e.target.value }))} placeholder="Wedding, party…" />
            </div>
            <div className="admin-form-group admin-form-full">
              <label>Package name (if not in list)</label>
              <input value={form.package_name} onChange={(e) => setForm((f) => ({ ...f, package_name: e.target.value }))} placeholder="Optional" />
            </div>
            <div className="admin-form-group">
              <label>Status</label>
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as BookingStatus }))}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="admin-card admin-bk-more-inner admin-bk-pay-card">
          <h2 className="admin-section-title">Deposit &amp; balance (optional)</h2>
          <div className="admin-form-grid admin-bk-pay-money">
            <div className="admin-form-group">
              <label>Deposit (£)</label>
              <input
                type="text"
                inputMode="decimal"
                value={form.deposit_pounds}
                onChange={(e) => setForm((f) => ({ ...f, deposit_pounds: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div className="admin-form-group">
              <label>Balance (£)</label>
              <input
                type="text"
                inputMode="decimal"
                value={form.balance_pounds}
                onChange={(e) => setForm((f) => ({ ...f, balance_pounds: e.target.value }))}
                placeholder={computedBalancePounds || "0.00"}
              />
              {computedBalancePounds ? (
                <span className="admin-vnd-new-hint">Suggested: total − deposit = £{computedBalancePounds}</span>
              ) : null}
            </div>
          </div>
          <label className="admin-bk-pay-sync">
            <input
              type="checkbox"
              checked={form.sync_instalments}
              onChange={(e) => setForm((f) => ({ ...f, sync_instalments: e.target.checked }))}
            />
            <span>Update instalment schedule when money is recorded</span>
          </label>
        </section>

        <section className="admin-card admin-bk-more-inner">
          <h2 className="admin-section-title">Notes</h2>
          <div className="admin-form-grid">
            <div className="admin-form-group admin-form-full">
              <label>Special requirements</label>
              <textarea rows={2} value={form.special_requirements} onChange={(e) => setForm((f) => ({ ...f, special_requirements: e.target.value }))} placeholder="Catering, access…" />
            </div>
            <div className="admin-form-group admin-form-full">
              <label>Internal notes</label>
              <textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional" />
            </div>
          </div>
          {form.enquiry_id && (
            <div className="admin-form-group admin-form-full">
              <label>Linked enquiry ID</label>
              <input value={form.enquiry_id} readOnly className="admin-input-readonly" />
            </div>
          )}
        </section>

        </details>

        <section className="admin-card admin-bk-simple-actions">
          <div className="admin-form-actions admin-form-full">
            <Link href="/admin/bookings" className="admin-btn admin-btn-ghost">Cancel</Link>
            <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
              {saving ? "Creating…" : "Create booking"}
            </button>
          </div>
        </section>
      </form>
    </div>
  );
}

export default function NewBookingPage() {
  return (
    <Suspense fallback={<p className="admin-lead">Loading…</p>}>
      <NewBookingForm />
    </Suspense>
  );
}
