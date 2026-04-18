"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-api-client";
import { useAdminDialog } from "@/components/admin/AdminDialogContext";
import type { InvoiceBusinessPayload } from "@/app/api/admin/settings/invoice-business/route";
import { DEFAULT_BOOKING_SLOTS } from "@/lib/booking-slots";

type SettingsTab = "logo" | "business" | "slots";

type SlotRow = { key: string; label: string; timeLabel: string };

export default function SettingsPage() {
  const { alert } = useAdminDialog();
  const [tab, setTab] = useState<SettingsTab>("logo");
  const [preferredLogoUrl, setPreferredLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [business, setBusiness] = useState<InvoiceBusinessPayload | null>(null);
  const [businessSaving, setBusinessSaving] = useState(false);
  const [bookingSlots, setBookingSlots] = useState<{
    enabled: boolean;
    maxPerSlot: number;
    allowWholeDay: boolean;
    wholeDayLabel: string;
    slots: SlotRow[];
  } | null>(null);
  const [slotsSaving, setSlotsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const loadSettings = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    Promise.allSettled([
      adminFetch("/api/admin/settings/invoice-logo")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => setPreferredLogoUrl(d?.url ?? null)),
      adminFetch("/api/admin/settings/invoice-business")
        .then((r) => {
          if (!r.ok) throw new Error("business");
          return r.json();
        })
        .then((d) => setBusiness(d || null)),
      adminFetch("/api/admin/settings/booking-slots")
        .then((r) => {
          if (!r.ok) throw new Error("slots");
          return r.json();
        })
        .then((d) =>
          setBookingSlots(
            d && typeof d === "object"
              ? {
                  enabled: d.enabled === true,
                  maxPerSlot: typeof d.maxPerSlot === "number" ? d.maxPerSlot : 1,
                  allowWholeDay: (d as { allowWholeDay?: boolean }).allowWholeDay !== false,
                  wholeDayLabel:
                    typeof (d as { wholeDayLabel?: string }).wholeDayLabel === "string"
                      ? (d as { wholeDayLabel: string }).wholeDayLabel
                      : "Full venue (whole day) — blocks every other slot on this date.",
                  slots: Array.isArray(d.slots) ? d.slots : [],
                }
              : null,
          ),
        ),
    ]).then((results) => {
      const biz = results[1];
      const slots = results[2];
      if (biz.status === "rejected" && slots.status === "rejected") {
        setLoadError("Couldn’t load settings. Check your connection and sign-in, then try again.");
      }
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadSettings();
  }, [reloadKey, loadSettings]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const r = await adminFetch("/api/admin/invoices/upload-logo", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setPreferredLogoUrl(d.url);
      setSaving(true);
      const put = await adminFetch("/api/admin/settings/invoice-logo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: d.url }),
      });
      if (!put.ok) throw new Error("Failed to save as preferred");
      await alert("Preferred logo updated.");
    } catch (err) {
      await alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      setSaving(false);
      e.target.value = "";
    }
  };

  const clearPreferred = async () => {
    setSaving(true);
    try {
      const r = await adminFetch("/api/admin/settings/invoice-logo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: null }),
      });
      if (!r.ok) throw new Error("Failed to clear");
      setPreferredLogoUrl(null);
      await alert("Preferred logo cleared.");
    } catch (err) {
      await alert(err instanceof Error ? err.message : "Failed to clear");
    } finally {
      setSaving(false);
    }
  };

  const saveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;
    setBusinessSaving(true);
    try {
      const r = await adminFetch("/api/admin/settings/invoice-business", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(business),
      });
      if (!r.ok) throw new Error("Failed to save");
      await alert("Business & bank details saved.");
    } catch (err) {
      await alert(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusinessSaving(false);
    }
  };

  const tabs: { id: SettingsTab; label: string; short: string }[] = [
    { id: "logo", label: "Invoice logo", short: "Logo" },
    { id: "business", label: "Business & bank", short: "Business" },
    { id: "slots", label: "Booking slots", short: "Slots" },
  ];

  return (
    <div className="admin-settings admin-settings-v2">
      <div className="admin-page-banner">
        <header className="admin-bk-hero admin-settings-v2-banner">
          <div className="admin-bk-hero-text">
            <p className="admin-dash-kicker">Admin</p>
            <h1 className="admin-page-title admin-bk-title">Settings</h1>
            <p className="admin-lead admin-bk-lead">Logo, business &amp; bank details, and booking time slots for the site and admin.</p>
          </div>
          <div className="admin-bk-hero-actions admin-settings-v2-hero-actions">
            <button type="button" className="admin-btn admin-btn-ghost" disabled={loading} onClick={() => setReloadKey((k) => k + 1)}>
              {loading ? "Loading…" : "Refresh"}
            </button>
            <Link href="/admin/bookings" className="admin-btn admin-btn-ghost">
              Bookings
            </Link>
            <Link href="/admin/calendar" className="admin-btn admin-btn-ghost">
              Calendar
            </Link>
            <nav className="admin-settings-v2-tabs admin-settings-v2-tabs--banner" aria-label="Settings sections">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`admin-settings-v2-tab ${tab === t.id ? "admin-settings-v2-tab--active" : ""}`}
                  onClick={() => setTab(t.id)}
                >
                  <span className="admin-settings-v2-tab-full">{t.label}</span>
                  <span className="admin-settings-v2-tab-short">{t.short}</span>
                </button>
              ))}
            </nav>
          </div>
        </header>
      </div>

      <div className="admin-settings-v2-panel">
        {loadError ? (
          <div className="admin-settings-load-error" role="alert">
            <p className="admin-settings-load-error-msg">{loadError}</p>
            <button type="button" className="admin-btn admin-btn-primary" onClick={() => setReloadKey((k) => k + 1)}>
              Try again
            </button>
          </div>
        ) : loading ? (
          <p className="admin-settings-loading">Loading settings…</p>
        ) : (
          <>
            {tab === "logo" && (
              <section className="admin-card admin-settings-v2-card">
                <h2 className="admin-card-heading">Invoice logo</h2>
                <p className="admin-settings-desc">PNG or JPG for invoice PDFs when you use “Use preferred logo”.</p>
                <div className="admin-settings-logo-wrap admin-settings-v2-logo">
                  {preferredLogoUrl && (
                    <div className="admin-settings-logo-preview">
                      <img src={preferredLogoUrl} alt="Preferred logo" />
                    </div>
                  )}
                  <div className="admin-settings-logo-actions">
                    <label className="admin-btn admin-btn-primary">
                      {uploading ? "Uploading…" : "Upload"}
                      <input type="file" accept="image/png,image/jpeg,image/jpg" disabled={uploading} onChange={handleUpload} className="admin-settings-file-input" />
                    </label>
                    {preferredLogoUrl && (
                      <button type="button" className="admin-btn admin-btn-ghost" disabled={saving} onClick={clearPreferred}>
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </section>
            )}

            {tab === "business" && !business && <p className="admin-settings-desc">Could not load business details.</p>}
            {tab === "business" && business && (
              <section className="admin-card admin-settings-v2-card">
                <h2 className="admin-card-heading">Business & payment</h2>
                <p className="admin-settings-desc">Venue details on PDFs; bank block when filled.</p>
                <form onSubmit={saveBusiness} className="admin-settings-form admin-settings-v2-compact">
                  <div className="admin-settings-v2-two-col">
                    <div className="admin-settings-field admin-settings-field--full">
                      <label>Venue name</label>
                      <input
                        value={business.venueName}
                        onChange={(e) => setBusiness((b) => (b ? { ...b, venueName: e.target.value } : b))}
                        className="admin-table-inline-input"
                      />
                    </div>
                    <div className="admin-settings-field admin-settings-field--full">
                      <label>Tagline</label>
                      <input
                        value={business.venueTagline}
                        onChange={(e) => setBusiness((b) => (b ? { ...b, venueTagline: e.target.value } : b))}
                        className="admin-table-inline-input"
                      />
                    </div>
                    <div className="admin-settings-field admin-settings-field--full">
                      <label>Address</label>
                      <input
                        value={business.venueAddress}
                        onChange={(e) => setBusiness((b) => (b ? { ...b, venueAddress: e.target.value } : b))}
                        className="admin-table-inline-input"
                      />
                    </div>
                    <div className="admin-settings-field">
                      <label>Phone</label>
                      <input type="tel" value={business.venuePhone} onChange={(e) => setBusiness((b) => (b ? { ...b, venuePhone: e.target.value } : b))} className="admin-table-inline-input" />
                    </div>
                    <div className="admin-settings-field">
                      <label>Email</label>
                      <input type="email" value={business.venueEmail} onChange={(e) => setBusiness((b) => (b ? { ...b, venueEmail: e.target.value } : b))} className="admin-table-inline-input" />
                    </div>
                  </div>
                  <h3 className="admin-settings-subheading">Bank</h3>
                  <div className="admin-settings-v2-two-col">
                    <div className="admin-settings-field">
                      <label>Bank</label>
                      <input value={business.bankName} onChange={(e) => setBusiness((b) => (b ? { ...b, bankName: e.target.value } : b))} className="admin-table-inline-input" />
                    </div>
                    <div className="admin-settings-field">
                      <label>Account name</label>
                      <input value={business.accountName} onChange={(e) => setBusiness((b) => (b ? { ...b, accountName: e.target.value } : b))} className="admin-table-inline-input" />
                    </div>
                    <div className="admin-settings-field">
                      <label>Sort code</label>
                      <input value={business.sortCode} onChange={(e) => setBusiness((b) => (b ? { ...b, sortCode: e.target.value } : b))} className="admin-table-inline-input" />
                    </div>
                    <div className="admin-settings-field">
                      <label>Account no.</label>
                      <input value={business.accountNumber} onChange={(e) => setBusiness((b) => (b ? { ...b, accountNumber: e.target.value } : b))} className="admin-table-inline-input" />
                    </div>
                    <div className="admin-settings-field admin-settings-field--full">
                      <label>Payment reference hint</label>
                      <input value={business.paymentReference} onChange={(e) => setBusiness((b) => (b ? { ...b, paymentReference: e.target.value } : b))} className="admin-table-inline-input" />
                    </div>
                  </div>
                  <div className="admin-settings-form-actions">
                    <button type="submit" className="admin-btn admin-btn-primary" disabled={businessSaving}>
                      {businessSaving ? "Saving…" : "Save"}
                    </button>
                  </div>
                </form>
              </section>
            )}

            {tab === "slots" && !bookingSlots && <p className="admin-settings-desc">Could not load slot settings.</p>}
            {tab === "slots" && bookingSlots && (
              <section className="admin-card admin-settings-v2-card admin-slots-settings">
                <header className="admin-slots-settings-head">
                  <p className="admin-slots-settings-kicker">Scheduling</p>
                  <h2 className="admin-card-heading admin-slots-settings-title">Booking time slots</h2>
                  <p className="admin-slots-settings-lead">
                    Drives the <strong>contact form</strong>, <strong>Create booking</strong>, and how many events fit on one date.
                    <span className="admin-slots-settings-code-hint">
                      {" "}
                      In the database, <code>event_slot_key</code> on a booking is a slot key (e.g. <code>morning</code>) or{" "}
                      <strong>empty</strong> for full venue / whole day — same idea as <strong>Edit booking → Full venue</strong>.
                    </span>
                  </p>
                </header>

                <form
                  className="admin-slots-settings-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setSlotsSaving(true);
                    try {
                      const r = await adminFetch("/api/admin/settings/booking-slots", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(bookingSlots),
                      });
                      if (!r.ok) throw new Error("Failed to save");
                      await alert("Booking slots saved.");
                    } catch (err) {
                      await alert(err instanceof Error ? err.message : "Failed");
                    } finally {
                      setSlotsSaving(false);
                    }
                  }}
                >
                  <div className="admin-slots-settings-panels">
                    <article className="admin-slots-settings-panel">
                      <div className="admin-slots-settings-panel-icon" aria-hidden>
                        ⏱
                      </div>
                      <h3 className="admin-slots-settings-panel-title">Time bands per day</h3>
                      <p className="admin-slots-settings-panel-desc">
                        When enabled, clients and staff pick a band (morning, evening…). Turn off for <strong>one whole-venue booking per date</strong> only.
                      </p>
                      <label className="admin-slots-settings-toggle-row">
                        <input
                          type="checkbox"
                          checked={bookingSlots.enabled}
                          onChange={(e) => setBookingSlots((s) => (s ? { ...s, enabled: e.target.checked } : s))}
                        />
                        <span className="admin-slots-settings-toggle-label">
                          <strong>Enable time slots</strong>
                          <small>Multi-event days</small>
                        </span>
                      </label>
                      <div className="admin-slots-settings-field">
                        <label htmlFor="slots-max-per">Max bookings per slot</label>
                        <input
                          id="slots-max-per"
                          type="number"
                          min={1}
                          max={20}
                          value={bookingSlots.maxPerSlot}
                          onChange={(e) =>
                            setBookingSlots((s) =>
                              s ? { ...s, maxPerSlot: Math.min(20, Math.max(1, parseInt(e.target.value, 10) || 1)) } : s,
                            )
                          }
                          className="admin-slots-settings-input"
                        />
                      </div>
                    </article>

                    <article className="admin-slots-settings-panel admin-slots-settings-panel--whole">
                      <div className="admin-slots-settings-panel-icon admin-slots-settings-panel-icon--whole" aria-hidden>
                        ◎
                      </div>
                      <h3 className="admin-slots-settings-panel-title">Full venue (whole day)</h3>
                      <p className="admin-slots-settings-panel-desc">
                        If the date has <strong>no active bookings</strong> yet, staff can tick this on <strong>Create booking</strong> (cancelled bookings don’t count).
                      </p>
                      <label className="admin-slots-settings-toggle-row">
                        <input
                          type="checkbox"
                          checked={bookingSlots.allowWholeDay}
                          onChange={(e) => setBookingSlots((s) => (s ? { ...s, allowWholeDay: e.target.checked } : s))}
                        />
                        <span className="admin-slots-settings-toggle-label">
                          <strong>Offer full venue when the day is free</strong>
                          <small>Checkbox on new booking + contact form</small>
                        </span>
                      </label>
                      <div className="admin-slots-settings-field">
                        <label htmlFor="slots-whole-label">Label on forms</label>
                        <textarea
                          id="slots-whole-label"
                          rows={2}
                          value={bookingSlots.wholeDayLabel}
                          onChange={(e) => setBookingSlots((s) => (s ? { ...s, wholeDayLabel: e.target.value.slice(0, 280) } : s))}
                          className="admin-slots-settings-textarea"
                          placeholder="Full venue (whole day)…"
                        />
                      </div>
                    </article>
                  </div>

                  <div className="admin-slots-settings-slots-section">
                    <div className="admin-slots-settings-slots-head">
                      <h3 className="admin-slots-settings-slots-title">Slot definitions</h3>
                      <p className="admin-slots-settings-slots-meta">
                        <strong>Key</strong> is saved on bookings and must stay stable (used in URLs and packages).
                      </p>
                    </div>
                    <ul className="admin-slots-settings-slot-list" aria-label="Time slots">
                      {bookingSlots.slots.map((row, i) => (
                        <li key={i} className="admin-slots-settings-slot-row">
                          <span className="admin-slots-settings-slot-idx">{i + 1}</span>
                          <div className="admin-slots-settings-slot-fields">
                            <div className="admin-slots-settings-field admin-slots-settings-field--grow">
                              <label>Label</label>
                              <input
                                value={row.label}
                                onChange={(e) =>
                                  setBookingSlots((s) =>
                                    s ? { ...s, slots: s.slots.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) } : s,
                                  )
                                }
                                className="admin-slots-settings-input"
                                placeholder="Morning"
                              />
                            </div>
                            <div className="admin-slots-settings-field admin-slots-settings-field--grow">
                              <label>Time</label>
                              <input
                                value={row.timeLabel}
                                onChange={(e) =>
                                  setBookingSlots((s) =>
                                    s ? { ...s, slots: s.slots.map((x, j) => (j === i ? { ...x, timeLabel: e.target.value } : x)) } : s,
                                  )
                                }
                                placeholder="9:00 – 12:00"
                                className="admin-slots-settings-input"
                              />
                            </div>
                            <div className="admin-slots-settings-field">
                              <label>Key</label>
                              <input
                                value={row.key}
                                onChange={(e) =>
                                  setBookingSlots((s) =>
                                    s
                                      ? {
                                          ...s,
                                          slots: s.slots.map((x, j) =>
                                            j === i ? { ...x, key: e.target.value.trim().toLowerCase().replace(/\s+/g, "_") } : x,
                                          ),
                                        }
                                      : s,
                                  )
                                }
                                className="admin-slots-settings-input admin-slots-settings-input-key"
                                spellCheck={false}
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            className="admin-slots-settings-slot-remove"
                            title="Remove slot"
                            aria-label={`Remove slot ${row.label || i + 1}`}
                            onClick={() => setBookingSlots((s) => (s ? { ...s, slots: s.slots.filter((_, j) => j !== i) } : s))}
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <footer className="admin-slots-settings-footer">
                    <div className="admin-slots-settings-footer-left">
                      <button
                        type="button"
                        className="admin-btn admin-btn-ghost"
                        onClick={() =>
                          setBookingSlots((s) => {
                            if (!s) return s;
                            const n = s.slots.length + 1;
                            return { ...s, slots: [...s.slots, { key: `slot_${n}`, label: `Slot ${n}`, timeLabel: "" }] };
                          })
                        }
                      >
                        + Add slot
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn-secondary"
                        onClick={() =>
                          setBookingSlots({
                            enabled: true,
                            maxPerSlot: DEFAULT_BOOKING_SLOTS.maxPerSlot,
                            allowWholeDay: DEFAULT_BOOKING_SLOTS.allowWholeDay,
                            wholeDayLabel: DEFAULT_BOOKING_SLOTS.wholeDayLabel,
                            slots: DEFAULT_BOOKING_SLOTS.slots.map((x) => ({ ...x })),
                          })
                        }
                      >
                        Restore defaults
                      </button>
                    </div>
                    <button type="submit" className="admin-btn admin-btn-primary" disabled={slotsSaving}>
                      {slotsSaving ? "Saving…" : "Save slot settings"}
                    </button>
                  </footer>
                </form>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
