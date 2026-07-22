"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { adminFetch, parseAdminError } from "@/lib/admin-api-client";
import { useAdminDialog } from "@/components/admin/AdminDialogContext";
import type { InvoiceBusinessPayload } from "@/app/api/admin/settings/invoice-business/route";
import { DEFAULT_BOOKING_SLOTS } from "@/lib/booking-slots";
import { VENUE_ADDRESS } from "@/lib/venue-constants";
import { HallsSettingsTab } from "@/components/admin/HallsSettingsTab";
import { HireContractSettingsTab } from "@/components/admin/HireContractSettingsTab";
import { IntegerInput } from "@/components/admin/MoneyInput";
import type { HireContractSettingsPayload } from "@/lib/hire-contract-settings";
import { HIRE_CONTRACT_SETTINGS_DEFAULTS } from "@/lib/hire-contract-settings";

type SettingsTab = "logo" | "business" | "contract" | "slots" | "halls" | "guide";

type SlotRow = { key: string; label: string; timeLabel: string };

const TAB_META: Record<
  SettingsTab,
  { label: string; short: string; kicker: string; feeds: string }
> = {
  logo: {
    label: "Invoice logo",
    short: "Logo",
    kicker: "Branding",
    feeds: "Invoice PDFs when you choose “Use preferred logo”.",
  },
  business: {
    label: "Business & bank",
    short: "Business",
    kicker: "Venue details",
    feeds: "Contracts, invoices, booking exports, and T&C PDF headers.",
  },
  contract: {
    label: "Hire contract",
    short: "Contract",
    kicker: "PDF pack",
    feeds: "Default hire contract pages, inclusions, options list, and intro text — overridable per booking.",
  },
  slots: {
    label: "Booking slots",
    short: "Slots",
    kicker: "Scheduling",
    feeds: "Contact form, new booking, calendar capacity, and package slot rules.",
  },
  halls: {
    label: "Halls & rooms",
    short: "Halls",
    kicker: "Venue layout",
    feeds: "Calendar blocking, bookings, enquiries, and contract hall names.",
  },
  guide: {
    label: "User guide (PDF)",
    short: "Guide",
    kicker: "Training",
    feeds: "Downloadable CRM handbook for your team.",
  },
};

const TABS: SettingsTab[] = ["logo", "business", "contract", "slots", "halls", "guide"];

function SettingsInput({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  full,
}: {
  id?: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  full?: boolean;
}) {
  return (
    <div className={`admin-settings-v2-field ${full ? "admin-settings-v2-field--full" : ""}`}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="admin-settings-v2-input"
      />
    </div>
  );
}

export default function SettingsPage() {
  const { alert } = useAdminDialog();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTabState] = useState<SettingsTab>("logo");
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
  const [guideDownloading, setGuideDownloading] = useState(false);
  const [hireContract, setHireContract] = useState<HireContractSettingsPayload>(HIRE_CONTRACT_SETTINGS_DEFAULTS);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const setTab = useCallback(
    (next: SettingsTab) => {
      setTabState(next);
      router.replace(`/admin/settings?tab=${next}`, { scroll: false });
    },
    [router],
  );

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
      adminFetch("/api/admin/settings/hire-contract")
        .then((r) => (r.ok ? r.json() : HIRE_CONTRACT_SETTINGS_DEFAULTS))
        .then((d) => setHireContract(d)),
    ])
      .then((results) => {
        const biz = results[1];
        const slots = results[2];
        if (biz.status === "rejected" && slots.status === "rejected") {
          setLoadError("Couldn’t load settings. Check your connection and sign-in, then try again.");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadSettings();
  }, [reloadKey, loadSettings]);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "guide" || t === "logo" || t === "business" || t === "contract" || t === "slots" || t === "halls") {
      setTabState(t);
    }
  }, [searchParams]);

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
      if (!put.ok) throw new Error(await parseAdminError(put, "Couldn’t save as preferred logo"));
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
      if (!r.ok) throw new Error(await parseAdminError(r, "Couldn’t clear logo"));
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
      if (!r.ok) throw new Error(await parseAdminError(r, "Couldn’t save business details"));
      await alert("Business & bank details saved.");
    } catch (err) {
      await alert(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusinessSaving(false);
    }
  };

  const downloadCrmGuide = async () => {
    setGuideDownloading(true);
    try {
      const r = await adminFetch("/api/admin/settings/crm-guide/pdf");
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(typeof j.error === "string" ? j.error : "Download failed");
      }
      const blob = await r.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "Grand-Round-House-CRM-User-Guide.pdf";
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      await alert(err instanceof Error ? err.message : "Could not download guide");
    } finally {
      setGuideDownloading(false);
    }
  };

  const activeMeta = TAB_META[tab];

  return (
    <div className="admin-settings admin-settings-v2">
      <div className="admin-page-banner">
        <header className="admin-bk-hero admin-settings-v2-banner">
          <div className="admin-bk-hero-text">
            <p className="admin-dash-kicker">Admin</p>
            <h1 className="admin-page-title admin-bk-title">Settings</h1>
            <p className="admin-lead admin-bk-lead">
              Logo, business &amp; bank, hire contract PDF, booking slots, and the CRM user guide — everything that feeds
              your PDFs and public forms.
            </p>
          </div>
          <div className="admin-bk-hero-actions admin-settings-v2-hero-actions">
            <button
              type="button"
              className="admin-btn admin-btn-ghost"
              disabled={loading}
              onClick={() => setReloadKey((k) => k + 1)}
            >
              {loading ? "Loading…" : "Refresh"}
            </button>
            <Link href="/admin/bookings" className="admin-btn admin-btn-ghost">
              Bookings
            </Link>
            <Link href="/admin/calendar" className="admin-btn admin-btn-ghost">
              Calendar
            </Link>
          </div>
        </header>
      </div>

      <nav className="admin-settings-v2-tabbar" aria-label="Settings sections">
        {TABS.map((id) => (
          <button
            key={id}
            type="button"
            className={`admin-settings-v2-tab ${tab === id ? "admin-settings-v2-tab--active" : ""}`}
            onClick={() => setTab(id)}
            aria-current={tab === id ? "page" : undefined}
          >
            <span className="admin-settings-v2-tab-full">{TAB_META[id].label}</span>
            <span className="admin-settings-v2-tab-short">{TAB_META[id].short}</span>
          </button>
        ))}
      </nav>

      <p className="admin-settings-v2-feeds">
        <span className="admin-settings-v2-feeds-label">{activeMeta.kicker}</span>
        {activeMeta.feeds}
      </p>

      <div className="admin-settings-v2-panel">
        {loadError ? (
          <div className="admin-settings-load-error" role="alert">
            <p className="admin-settings-load-error-msg">{loadError}</p>
            <button type="button" className="admin-btn admin-btn-primary" onClick={() => setReloadKey((k) => k + 1)}>
              Try again
            </button>
          </div>
        ) : loading ? (
          <div className="admin-settings-v2-skeleton" aria-busy="true">
            <p className="admin-settings-loading">Loading settings…</p>
          </div>
        ) : (
          <>
            {tab === "logo" && (
              <section className="admin-card admin-settings-v2-card admin-settings-v2-logo-section">
                <header className="admin-settings-v2-section-head">
                  <p className="admin-settings-v2-kicker">{TAB_META.logo.kicker}</p>
                  <h2 className="admin-card-heading">Invoice logo</h2>
                  <p className="admin-settings-desc">
                    PNG or JPG — shown on invoice PDFs when you tick <strong>Use preferred logo</strong> on a new invoice.
                  </p>
                </header>

                <div className="admin-settings-v2-logo-grid">
                  <div className="admin-settings-v2-logo-preview-card">
                    {preferredLogoUrl ? (
                      <img src={preferredLogoUrl} alt="Preferred invoice logo" />
                    ) : (
                      <div className="admin-settings-v2-logo-empty">
                        <span aria-hidden>◇</span>
                        <p>No logo saved yet</p>
                      </div>
                    )}
                  </div>

                  <div className="admin-settings-v2-logo-side">
                    <ul className="admin-settings-v2-usage-list">
                      <li>Invoices → “Use preferred logo” on create</li>
                      <li>Stored once — reused across all staff</li>
                      <li>Recommended: transparent PNG, max height ~120px</li>
                    </ul>
                    <div className="admin-settings-logo-actions">
                      <label className="admin-btn admin-btn-primary">
                        {uploading ? "Uploading…" : preferredLogoUrl ? "Replace logo" : "Upload logo"}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg"
                          disabled={uploading}
                          onChange={handleUpload}
                          className="admin-settings-file-input"
                        />
                      </label>
                      {preferredLogoUrl ? (
                        <button type="button" className="admin-btn admin-btn-ghost" disabled={saving} onClick={clearPreferred}>
                          Remove
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {tab === "business" && !business && (
              <p className="admin-settings-desc">Could not load business details.</p>
            )}
            {tab === "business" && business && (
              <section className="admin-card admin-settings-v2-card">
                <header className="admin-settings-v2-section-head">
                  <p className="admin-settings-v2-kicker">{TAB_META.business.kicker}</p>
                  <h2 className="admin-card-heading">Business &amp; payment</h2>
                  <p className="admin-settings-desc">
                    Venue name, address, and contact details appear on hire contracts, T&amp;Cs, invoices, and booking
                    exports. Bank details show on contract payment pages when filled in.
                  </p>
                </header>

                <form onSubmit={saveBusiness} className="admin-settings-v2-form">
                  <div className="admin-settings-v2-panels">
                    <article className="admin-settings-v2-panel">
                      <h3 className="admin-settings-v2-panel-title">Venue &amp; contact</h3>
                      <div className="admin-settings-v2-fields">
                        <SettingsInput
                          id="venue-name"
                          label="Venue name"
                          value={business.venueName}
                          onChange={(v) => setBusiness((b) => (b ? { ...b, venueName: v } : b))}
                          full
                        />
                        <SettingsInput
                          id="venue-tagline"
                          label="Tagline"
                          value={business.venueTagline}
                          onChange={(v) => setBusiness((b) => (b ? { ...b, venueTagline: v } : b))}
                          full
                        />
                        <SettingsInput
                          id="venue-address"
                          label="Address"
                          value={business.venueAddress}
                          placeholder={VENUE_ADDRESS}
                          onChange={(v) => setBusiness((b) => (b ? { ...b, venueAddress: v } : b))}
                          full
                        />
                        <SettingsInput
                          id="venue-phone"
                          label="Phone"
                          type="tel"
                          value={business.venuePhone}
                          onChange={(v) => setBusiness((b) => (b ? { ...b, venuePhone: v } : b))}
                        />
                        <SettingsInput
                          id="venue-email"
                          label="Email"
                          type="email"
                          value={business.venueEmail}
                          onChange={(v) => setBusiness((b) => (b ? { ...b, venueEmail: v } : b))}
                        />
                      </div>
                    </article>

                    <article className="admin-settings-v2-panel admin-settings-v2-panel--accent">
                      <h3 className="admin-settings-v2-panel-title">Bank details</h3>
                      <p className="admin-settings-v2-panel-desc">Optional — included on hire contract payment page when set.</p>
                      <div className="admin-settings-v2-fields">
                        <SettingsInput
                          id="bank-name"
                          label="Bank"
                          value={business.bankName}
                          onChange={(v) => setBusiness((b) => (b ? { ...b, bankName: v } : b))}
                        />
                        <SettingsInput
                          id="account-name"
                          label="Account name"
                          value={business.accountName}
                          onChange={(v) => setBusiness((b) => (b ? { ...b, accountName: v } : b))}
                        />
                        <SettingsInput
                          id="sort-code"
                          label="Sort code"
                          value={business.sortCode}
                          onChange={(v) => setBusiness((b) => (b ? { ...b, sortCode: v } : b))}
                        />
                        <SettingsInput
                          id="account-number"
                          label="Account number"
                          value={business.accountNumber}
                          onChange={(v) => setBusiness((b) => (b ? { ...b, accountNumber: v } : b))}
                        />
                        <SettingsInput
                          id="payment-ref"
                          label="Payment reference hint"
                          value={business.paymentReference}
                          onChange={(v) => setBusiness((b) => (b ? { ...b, paymentReference: v } : b))}
                          full
                        />
                      </div>
                    </article>
                  </div>

                  <div className="admin-settings-form-actions">
                    <button type="submit" className="admin-btn admin-btn-primary" disabled={businessSaving}>
                      {businessSaving ? "Saving…" : "Save business & bank"}
                    </button>
                  </div>
                </form>
              </section>
            )}

            {tab === "contract" && (
              <HireContractSettingsTab initial={hireContract} onSaved={setHireContract} />
            )}

            {tab === "slots" && !bookingSlots && <p className="admin-settings-desc">Could not load slot settings.</p>}
            {tab === "slots" && bookingSlots && (
              <section className="admin-card admin-settings-v2-card admin-slots-settings">
                <header className="admin-slots-settings-head">
                  <p className="admin-slots-settings-kicker">{TAB_META.slots.kicker}</p>
                  <h2 className="admin-card-heading admin-slots-settings-title">Booking time slots</h2>
                  <p className="admin-slots-settings-lead">
                    Drives the <strong>contact form</strong>, <strong>Create booking</strong>, and how many events fit on
                    one date.
                    <span className="admin-slots-settings-code-hint">
                      {" "}
                      In the database, <code>event_slot_key</code> on a booking is a slot key (e.g. <code>morning</code>)
                      or <strong>empty</strong> for full venue / whole day.
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
                      if (!r.ok) throw new Error(await parseAdminError(r, "Couldn’t save booking slots"));
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
                        When enabled, clients and staff pick a band (morning, evening…). Turn off for{" "}
                        <strong>one whole-venue booking per date</strong> only.
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
                        <IntegerInput
                          id="slots-max-per"
                          min={1}
                          max={20}
                          value={bookingSlots.maxPerSlot}
                          onChange={(maxPerSlot) =>
                            setBookingSlots((s) => (s ? { ...s, maxPerSlot } : s))
                          }
                          className="admin-slots-settings-input admin-settings-v2-input-narrow"
                          aria-label="Max bookings per slot"
                        />
                      </div>
                    </article>

                    <article className="admin-slots-settings-panel admin-slots-settings-panel--whole">
                      <div className="admin-slots-settings-panel-icon admin-slots-settings-panel-icon--whole" aria-hidden>
                        ◎
                      </div>
                      <h3 className="admin-slots-settings-panel-title">Full venue (whole day)</h3>
                      <p className="admin-slots-settings-panel-desc">
                        If the date has <strong>no active bookings</strong> yet, staff can tick this on{" "}
                        <strong>Create booking</strong> (cancelled bookings don’t count).
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
                                    s
                                      ? { ...s, slots: s.slots.map((x, j) => (j === i ? { ...x, timeLabel: e.target.value } : x)) }
                                      : s,
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

            {tab === "halls" && (
              <section className="admin-card admin-settings-v2-card">
                <header className="admin-settings-v2-section-head">
                  <p className="admin-settings-v2-kicker">{TAB_META.halls.kicker}</p>
                  <h2 className="admin-card-heading">{TAB_META.halls.label}</h2>
                </header>
                <HallsSettingsTab />
              </section>
            )}

            {tab === "guide" && (
              <section className="admin-card admin-settings-v2-card admin-settings-v2-guide">
                <header className="admin-settings-v2-section-head">
                  <p className="admin-settings-v2-kicker">{TAB_META.guide.kicker}</p>
                  <h2 className="admin-card-heading">CRM user guide (PDF)</h2>
                  <p className="admin-settings-desc">
                    Professional staff handbook with visual diagrams — client pipeline, settings hub, booking workspace
                    tabs, module reference, connection matrix, and daily checklist.
                  </p>
                </header>

                <div className="admin-settings-v2-guide-grid">
                  <ul className="admin-settings-guide-list">
                    <li>Diagram — Client journey pipeline (8 steps, booking at the centre)</li>
                    <li>Diagram — Settings hub (logo, business, slots, season pricing → CRM modules)</li>
                    <li>Diagram — Booking workspace 8 tabs in recommended order</li>
                    <li>Module reference — every sidebar area with admin paths and bullets</li>
                    <li>Connection matrix + numbered daily checklist for new staff</li>
                  </ul>

                  <div className="admin-settings-v2-guide-cta">
                    <button
                      type="button"
                      className="admin-btn admin-btn-primary"
                      disabled={guideDownloading}
                      onClick={downloadCrmGuide}
                    >
                      {guideDownloading ? "Generating PDF…" : "Download CRM user guide"}
                    </button>
                    <Link href="/admin/operations" className="admin-btn admin-btn-ghost">
                      Operations hub →
                    </Link>
                    <p className="admin-settings-v2-guide-tip">
                      Configure{" "}
                      <button type="button" className="admin-link-btn" onClick={() => setTab("business")}>
                        Business &amp; bank
                      </button>{" "}
                      and{" "}
                      <button type="button" className="admin-link-btn" onClick={() => setTab("slots")}>
                        Booking slots
                      </button>{" "}
                      first — the guide assumes those are set up.
                    </p>
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
