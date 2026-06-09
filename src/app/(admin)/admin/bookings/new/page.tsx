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
import { BOOKING_PAYMENT_LABELS, hireInstalmentPreview, firstInstalmentCents } from "@/lib/booking-payment-labels";

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
  const prefillSlotKey = useRef<string | null>(null);

  const slotsMultiMode = slotConfig.enabled && slotConfig.slots.length > 0;

  const [form, setForm] = useState({
    client_name: "",
    client_email: "",
    client_phone: "",
    event_date: "",
    event_type: "",
    package_name: "",
    status: "pending" as BookingStatus,
    total_pounds: "",
    deposit_pounds: "",
    balance_pounds: "",
    payment_received_pounds: "",
    record_payment_now: false,
    sync_instalments: true,
    payment_received_label: "On Booking Confirmation",
    special_requirements: "",
    notes: "",
    enquiry_id: "",
  });

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

  const contractTotalCents = useMemo(() => poundsToCents(form.total_pounds), [form.total_pounds]);
  const instalmentPreview = useMemo(
    () => (contractTotalCents != null && contractTotalCents > 0 ? hireInstalmentPreview(contractTotalCents) : []),
    [contractTotalCents],
  );
  const instalmentCents = useMemo(
    () => (contractTotalCents != null && contractTotalCents > 0 ? firstInstalmentCents(contractTotalCents) : null),
    [contractTotalCents],
  );

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
    const payment_received_cents = form.record_payment_now ? poundsToCents(form.payment_received_pounds) : null;
    if (form.record_payment_now && (!payment_received_cents || payment_received_cents <= 0)) {
      const msg = "Enter a valid payment amount, or turn off “Record payment now”.";
      setFormError(msg);
      await alert(msg, { title: "Payment amount required" });
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
          client_name: form.client_name || null,
          client_email: form.client_email,
          client_phone: form.client_phone || null,
          event_date: form.event_date,
          event_type: form.event_type || null,
          package_name: form.package_name || null,
          package_id: packageId || null,
          status: form.status,
          total_cents,
          deposit_cents,
          balance_cents,
          record_deposit_received:
            form.record_payment_now &&
            form.payment_received_label === "Deposit" &&
            deposit_cents != null &&
            payment_received_cents === deposit_cents,
          payment_received_cents:
            payment_received_cents && payment_received_cents > 0 ? payment_received_cents : null,
          payment_received_label: form.payment_received_label,
          sync_milestones: form.sync_instalments,
          special_requirements: form.special_requirements || null,
          notes: form.notes || null,
          enquiry_id: form.enquiry_id || null,
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
              Set the event date to see suggested pricing from season or day override. You can apply a sale price or pick a package.
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
        <section className="admin-card">
          <h2 className="admin-section-title">Client</h2>
          <div className="admin-form-grid">
            <div className="admin-form-group">
              <label>Client name</label>
              <input value={form.client_name} onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))} placeholder="Full name" />
            </div>
            <div className="admin-form-group">
              <label>Email *</label>
              <input type="email" required value={form.client_email} onChange={(e) => setForm((f) => ({ ...f, client_email: e.target.value }))} placeholder="email@example.com" />
            </div>
            <div className="admin-form-group admin-form-full">
              <label>Phone</label>
              <input type="tel" value={form.client_phone} onChange={(e) => setForm((f) => ({ ...f, client_phone: e.target.value }))} placeholder="Optional" />
            </div>
          </div>
        </section>

        <section className="admin-card">
          <h2 className="admin-section-title">Event & pricing</h2>
          <div className="admin-form-grid">
            <div className="admin-form-group admin-form-full">
              <label>Event date *</label>
              <input
                type="date"
                required
                min={minSelectableEventDateYYYYMMDD()}
                value={form.event_date}
                onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))}
              />
            </div>
            {!slotsMultiMode && form.event_date ? (
              <div className="admin-form-group admin-form-full">
                <label>Full venue (whole day)</label>
                <div
                  className="admin-bk-whole-day-banner"
                  style={{
                    padding: "0.85rem 1rem",
                    borderRadius: "12px",
                    border: "1px solid rgba(34, 197, 94, 0.35)",
                    background: "rgba(34, 197, 94, 0.1)",
                    fontSize: "0.9rem",
                    lineHeight: 1.45,
                  }}
                >
                  <strong style={{ display: "block", marginBottom: "0.35rem" }}>This booking uses the whole venue for the day</strong>
                  <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
                    Multi-slot mode is off in{" "}
                    <Link href="/admin/settings" className="admin-link">
                      Settings → Booking slots
                    </Link>
                    . Only one active booking per date. <strong>Cancelled</strong> bookings do not block the date.
                  </p>
                </div>
              </div>
            ) : null}
            <div className="admin-form-group">
              <label>Event type</label>
              <input value={form.event_type} onChange={(e) => setForm((f) => ({ ...f, event_type: e.target.value }))} placeholder="Wedding, Reception…" />
            </div>
            <div className="admin-form-group admin-form-full">
              <label>Package from catalog (optional)</label>
              <p className="admin-vnd-new-hint" style={{ marginBottom: "0.35rem" }}>
                Pick a package <strong>before</strong> the time slot if the offer is tied to morning / evening etc.
              </p>
              <select
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
                <option value="">— Manual / none —</option>
                {packages.map((p) => {
                  const keys = Array.isArray(p.event_slot_keys) ? p.event_slot_keys.filter((x): x is string => typeof x === "string") : [];
                  return (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.base_price_cents != null ? ` (${gbp(p.base_price_cents)})` : ""}
                      {keys.length ? ` · ${keys.length} slot${keys.length > 1 ? "s" : ""}` : ""}
                    </option>
                  );
                })}
              </select>
              {packageHasSlotList ? (
                <p className="admin-vnd-new-hint" style={{ marginTop: "0.5rem", color: "var(--color-gold-dark)", fontWeight: 600 }}>
                  This package is only valid for:{" "}
                  {pkgSlotKeys
                    .map((k) =>
                      k === WHOLE_DAY_KEY ? "Full venue (whole day)" : slotConfig.slots.find((s) => s.key === k)?.label || k,
                    )
                    .join(", ")}
                  .
                </p>
              ) : null}
            </div>
            {slotsMultiMode && form.event_date && (
              <div className="admin-form-group admin-form-full">
                <label>Full venue or time slot</label>
                <p className="admin-vnd-new-hint" style={{ marginBottom: "0.65rem" }}>
                  Same logic as <strong>Edit booking</strong> → <strong>Full venue (whole day)</strong> (empty slot in the database). Pick whole day first, or a single band below.
                </p>
                {slotsError ? (
                  <p className="admin-vnd-new-hint" style={{ color: "#b45309", marginBottom: "0.65rem" }} role="alert">
                    {slotsError}
                  </p>
                ) : null}
                {slotConfig.allowWholeDay ? (
                  <div
                    className={`admin-bk-whole-pick ${wholeDayAvailable && packageAllowsWholeDay ? "admin-bk-whole-pick--ready" : "admin-bk-whole-pick--muted"}`}
                  >
                    <div className="admin-bk-whole-pick-head">
                      <span className="admin-bk-whole-pick-icon" aria-hidden>
                        ◎
                      </span>
                      <div className="admin-bk-whole-pick-head-text">
                        {packageWholeDayOnly ? (
                          <p className="admin-bk-whole-pick-status admin-bk-whole-pick-status--pkg">This package is full venue (whole day) only</p>
                        ) : packageDisallowsWholeDay ? (
                          <p className="admin-bk-whole-pick-status admin-bk-whole-pick-status--pkg">Package requires a time slot</p>
                        ) : wholeDayAvailable && packageAllowsWholeDay ? (
                          <p className="admin-bk-whole-pick-status">Date is free — whole venue or one slot</p>
                        ) : (
                          <p className="admin-bk-whole-pick-status admin-bk-whole-pick-status--wait">Whole venue unavailable on this date</p>
                        )}
                        <p className="admin-bk-whole-pick-sub">
                          {packageWholeDayOnly
                            ? "Tick full venue below. Individual time bands are not available for this catalog item."
                            : packageDisallowsWholeDay
                              ? "Choose a matching slot under your package."
                              : wholeDayAvailable && packageAllowsWholeDay
                                ? "Reserve the entire day (blocks every slot) or pick a single band below."
                                : "Pick a free slot below, or another date for a full-day event. Cancelled bookings don’t block."}
                        </p>
                      </div>
                    </div>
                    <label
                      className={`admin-bk-whole-pick-row ${packageDisallowsWholeDay || !wholeDayAvailable ? "admin-bk-whole-pick-row--disabled" : ""}`}
                    >
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
                        <span className="admin-bk-whole-pick-label-main">{slotConfig.wholeDayLabel}</span>
                        {packageDisallowsWholeDay ? (
                          <span className="admin-bk-whole-pick-label-hint">Not combinable with this package</span>
                        ) : !wholeDayAvailable ? (
                          <span className="admin-bk-whole-pick-label-hint">Only when the date has no other active booking</span>
                        ) : null}
                      </span>
                    </label>
                  </div>
                ) : (
                  <p className="admin-vnd-new-hint" style={{ marginBottom: "0.75rem" }}>
                    Full venue is turned off in{" "}
                    <Link href="/admin/settings" className="admin-link">
                      Settings → Booking slots
                    </Link>
                    .
                  </p>
                )}
                {dateBookings.length > 0 ? (
                  <div
                    className="admin-bk-date-bookings"
                    style={{
                      marginBottom: "0.85rem",
                      marginTop: "0.85rem",
                      padding: "0.65rem 0.85rem",
                      borderRadius: "10px",
                      border: "1px solid var(--color-border)",
                      background: "var(--color-surface)",
                      fontSize: "0.85rem",
                    }}
                  >
                    <strong style={{ display: "block", marginBottom: "0.35rem" }}>Already on this date</strong>
                    <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
                      {dateBookings.map((b) => (
                        <li key={b.id} style={{ marginBottom: "0.25rem" }}>
                          <Link href={`/admin/bookings/${b.id}`} className="admin-link">
                            {b.booking_code || b.id.slice(0, 8)}
                          </Link>
                          {" · "}
                          {b.client_name || "—"} · {slotLabelFor(b.event_slot_key)}{" · "}
                          <span
                            style={{
                              fontWeight: 700,
                              textTransform: "capitalize",
                              color:
                                b.status === "cancelled"
                                  ? "#64748b"
                                  : b.status === "confirmed"
                                    ? "#15803d"
                                    : b.status === "completed"
                                      ? "#0369a1"
                                      : "#b45309",
                            }}
                          >
                            {b.status}
                          </span>
                          {b.status === "cancelled" ? (
                            <span style={{ color: "var(--color-text-muted)" }}> (does not block slots)</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {!wholeDay && (
                  <>
                    {slotsLoading ? (
                      <p className="admin-vnd-new-hint" style={{ marginTop: "0.5rem" }}>
                        Loading availability…
                      </p>
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
                              className={`admin-bk-slot-card ${eventSlotKey === s.key ? "admin-bk-slot-card--selected" : ""} ${!s.available ? "admin-bk-slot-card--full" : ""} ${packageHasSlotList && !slotAllowed ? "admin-bk-slot-card--pkg" : ""}`}
                            >
                              <span className="admin-bk-slot-card-name">{s.label}</span>
                              {s.timeLabel ? <span className="admin-bk-slot-card-time">{s.timeLabel}</span> : null}
                              <span
                                className={`admin-bk-slot-card-badge ${!s.available ? "admin-bk-slot-card-badge--full" : ""} ${packageHasSlotList && !slotAllowed ? "admin-bk-slot-card-badge--pkg" : ""}`}
                              >
                                {!slotAllowed ? "Not this package" : s.available ? "Available" : "Full"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
                <span className="admin-vnd-new-hint">Same slots as the contact form. Configure under Settings → Booking slots.</span>
              </div>
            )}
            {priceError ? (
              <div className="admin-form-group admin-form-full" role="alert">
                <p className="admin-vnd-new-hint" style={{ color: "#b45309", margin: 0 }}>
                  {priceError} — enter a sale price manually or check{" "}
                  <Link href="/admin/pricing" className="admin-link">
                    Season pricing
                  </Link>
                  .
                </p>
              </div>
            ) : null}
            {form.event_date && priceSource && !priceError ? (
              <div className="admin-form-group admin-form-full" style={{ padding: "0.75rem", background: "var(--color-surface)", borderRadius: "var(--radius)", gridColumn: "1 / -1" }}>
                <strong>Suggested price</strong>
                {priceSource.suggested_total_cents != null ? (
                  <>
                    {" "}{gbp(priceSource.suggested_total_cents)}
                    {priceSource.source === "day_override" && " (day override)"}
                    {priceSource.source === "season" && priceSource.band && ` — from season "${priceSource.band.name}"`}
                    {priceSource.note && <span style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}> — {priceSource.note}</span>}
                  </>
                ) : (
                  <span style={{ color: "var(--color-text-muted)" }}> No season or day price set for this date</span>
                )}
              </div>
            ) : null}
            <div className="admin-form-group">
              <label>Total (£) — sale price / override</label>
              <input
                type="text"
                inputMode="decimal"
                value={form.total_pounds}
                onChange={(e) => setForm((f) => ({ ...f, total_pounds: e.target.value }))}
                placeholder="e.g. 5000.00"
              />
              <span className="admin-vnd-new-hint">Leave blank to use suggested; or enter a sale price.</span>
            </div>
            <div className="admin-form-group admin-form-full">
              <label>Package name (override)</label>
              <input value={form.package_name} onChange={(e) => setForm((f) => ({ ...f, package_name: e.target.value }))} placeholder="Filled from catalog or type freely" />
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

        <section className="admin-card admin-bk-pay-card">
          <div className="admin-bk-pay-head">
            <div>
              <h2 className="admin-section-title">Payments &amp; instalments</h2>
              <p className="admin-bk-pay-lead">
                Sets the hire contract 4×25% schedule on the booking summary. Record money received now if the client
                has already paid.
              </p>
            </div>
          </div>

          {instalmentPreview.length > 0 ? (
            <div className="admin-bk-pay-preview">
              <p className="admin-bk-pay-preview-title">Instalment schedule (from contract total)</p>
              <ul className="admin-bk-pay-preview-list">
                {instalmentPreview.map((row, i) => (
                  <li key={row.label} className="admin-bk-pay-preview-row">
                    <span className="admin-bk-pay-preview-num">{i + 1}</span>
                    <span className="admin-bk-pay-preview-label">{row.label}</span>
                    <span className="admin-bk-pay-preview-amt">{gbp(row.amountCents)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="admin-bk-pay-hint">Enter a contract total above to preview the 4 instalments.</p>
          )}

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

          <div className="admin-bk-pay-record">
            <label className="admin-bk-pay-record-toggle">
              <input
                type="checkbox"
                checked={form.record_payment_now}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    record_payment_now: e.target.checked,
                    payment_received_pounds:
                      e.target.checked && !f.payment_received_pounds.trim() && instalmentCents
                        ? centsToPounds(instalmentCents)
                        : f.payment_received_pounds,
                    payment_received_label:
                      e.target.checked && f.payment_received_label === "Deposit" && instalmentCents
                        ? "On Booking Confirmation"
                        : f.payment_received_label,
                  }))
                }
              />
              <span className="admin-bk-pay-record-toggle-text">
                <strong>Record payment now</strong>
                <span>Adds a ledger entry and can mark instalments paid in order.</span>
              </span>
            </label>

            {form.record_payment_now ? (
              <div className="admin-bk-pay-record-panel">
                <div className="admin-form-grid">
                  <div className="admin-form-group">
                    <label>Amount received (£)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={form.payment_received_pounds}
                      onChange={(e) => setForm((f) => ({ ...f, payment_received_pounds: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="admin-form-group">
                    <label>Payment type</label>
                    <select
                      value={form.payment_received_label}
                      onChange={(e) => setForm((f) => ({ ...f, payment_received_label: e.target.value }))}
                    >
                      {BOOKING_PAYMENT_LABELS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="admin-bk-pay-quick">
                  <span className="admin-bk-pay-quick-label">Quick fill</span>
                  <div className="admin-bk-pay-quick-btns">
                    {form.deposit_pounds.trim() ? (
                      <button
                        type="button"
                        className="admin-btn admin-btn-ghost admin-btn-sm"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            payment_received_pounds: f.deposit_pounds,
                            payment_received_label: "Deposit",
                          }))
                        }
                      >
                        Deposit (£{form.deposit_pounds})
                      </button>
                    ) : null}
                    {instalmentCents ? (
                      <button
                        type="button"
                        className="admin-btn admin-btn-ghost admin-btn-sm"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            payment_received_pounds: centsToPounds(instalmentCents),
                            payment_received_label: "On Booking Confirmation",
                          }))
                        }
                      >
                        25% instalment ({gbp(instalmentCents)})
                      </button>
                    ) : null}
                    {computedBalancePounds ? (
                      <button
                        type="button"
                        className="admin-btn admin-btn-ghost admin-btn-sm"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            payment_received_pounds: computedBalancePounds,
                            payment_received_label: "Balance",
                          }))
                        }
                      >
                        Balance (£{computedBalancePounds})
                      </button>
                    ) : null}
                    {form.total_pounds.trim() ? (
                      <button
                        type="button"
                        className="admin-btn admin-btn-ghost admin-btn-sm"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            payment_received_pounds: f.total_pounds,
                            payment_received_label: "Full hall hire",
                          }))
                        }
                      >
                        Full total (£{form.total_pounds})
                      </button>
                    ) : null}
                  </div>
                </div>

                <label className="admin-bk-pay-sync">
                  <input
                    type="checkbox"
                    checked={form.sync_instalments}
                    onChange={(e) => setForm((f) => ({ ...f, sync_instalments: e.target.checked }))}
                  />
                  <span>
                    Mark hire contract instalments as paid in order (creates 4×25% schedule if missing)
                  </span>
                </label>
              </div>
            ) : null}
          </div>
        </section>

        <section className="admin-card">
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

        <section className="admin-card">
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
