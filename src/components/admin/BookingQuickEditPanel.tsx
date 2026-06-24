"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { Booking, BookingStatus } from "@/types/crm";
import { AdminDateAvailabilityAdvisory } from "@/components/admin/AdminDateAvailabilityAdvisory";

const STATUS_OPTIONS: BookingStatus[] = ["pending", "confirmed", "cancelled", "completed"];
const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  completed: "Completed",
};

type PackageOption = { id: string; name: string; base_price_cents: number | null };
type SlotDef = { key: string; label: string; timeLabel: string };

type Props = {
  bookingId: string;
  form: Partial<Booking>;
  setForm: React.Dispatch<React.SetStateAction<Partial<Booking>>>;
  totalPounds: string;
  setTotalPounds: (v: string) => void;
  depositPounds: string;
  setDepositPounds: (v: string) => void;
  balancePounds: string;
  setBalancePounds: (v: string) => void;
  packagesList: PackageOption[];
  slotDefs: SlotDef[];
  minEventDateForInput: string;
  thisBookingHolds: { mode: "whole_day" | "slot"; label: string; timeLabel?: string };
  onPackageSelect: (packageId: string) => void;
  onSave: (e: React.FormEvent) => Promise<boolean>;
  saving: boolean;
  eventDateLabel?: string;
};

/** Scroll to the edit form (used by header “Edit booking”). */
export function openBookingQuickEdit() {
  const el = document.getElementById("booking-quick-edit");
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  const first = el.querySelector<HTMLInputElement>("input, select, textarea");
  first?.focus();
}

export function BookingQuickEditPanel({
  bookingId,
  form,
  setForm,
  totalPounds,
  setTotalPounds,
  depositPounds,
  setDepositPounds,
  balancePounds,
  setBalancePounds,
  packagesList,
  slotDefs,
  minEventDateForInput,
  thisBookingHolds,
  onPackageSelect,
  onSave,
  saving,
}: Props) {
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#booking-quick-edit") {
      openBookingQuickEdit();
    }
  }, []);

  return (
    <section ref={panelRef} className="admin-card admin-bk-simple-card admin-bkd-quick admin-bkd-quick--open" id="booking-quick-edit">
      <h2 className="admin-section-title">Edit booking</h2>
      <p className="admin-bkd-quick-lead">Change details below, then press Save.</p>

      <form
        className="admin-bkd-quick-form"
        onSubmit={async (e) => {
          e.preventDefault();
          await onSave(e);
        }}
      >
        <div className="admin-bkd-quick-block">
          <h3 className="admin-bkd-quick-block-title">Client</h3>
          <div className="admin-bkd-quick-grid admin-bkd-quick-grid--3">
            <label className="admin-bkd-quick-field">
              <span>Name</span>
              <input
                className="admin-bk-simple-input"
                value={form.client_name ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))}
                placeholder="Full name"
                autoComplete="name"
              />
            </label>
            <label className="admin-bkd-quick-field">
              <span>Email *</span>
              <input
                className="admin-bk-simple-input"
                type="email"
                required
                value={form.client_email ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, client_email: e.target.value }))}
                placeholder="email@example.com"
                autoComplete="email"
              />
            </label>
            <label className="admin-bkd-quick-field">
              <span>Phone</span>
              <input
                className="admin-bk-simple-input"
                type="tel"
                value={form.client_phone ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, client_phone: e.target.value }))}
                placeholder="07…"
                autoComplete="tel"
              />
            </label>
          </div>
        </div>

        <div className="admin-bkd-quick-block">
          <h3 className="admin-bkd-quick-block-title">Event</h3>
          <div className="admin-bkd-quick-grid admin-bkd-quick-grid--2">
            <label className="admin-bkd-quick-field">
              <span>Date *</span>
              <input
                className="admin-bk-simple-input"
                type="date"
                required
                min={minEventDateForInput}
                value={form.event_date ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))}
              />
            </label>
            <label className="admin-bkd-quick-field">
              <span>Time slot</span>
              <select
                className="admin-bk-simple-input"
                value={form.event_slot_key == null || form.event_slot_key === "" ? "" : form.event_slot_key}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    event_slot_key: e.target.value === "" ? null : e.target.value,
                  }))
                }
              >
                <option value="">Full venue (whole day)</option>
                {slotDefs.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                    {s.timeLabel ? ` · ${s.timeLabel}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-bkd-quick-field">
              <span>Event type</span>
              <input
                className="admin-bk-simple-input"
                value={form.event_type ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, event_type: e.target.value }))}
                placeholder="Wedding, party…"
              />
            </label>
            <label className="admin-bkd-quick-field">
              <span>Package</span>
              <select className="admin-bk-simple-input" value={form.package_id ?? ""} onChange={(e) => onPackageSelect(e.target.value)}>
                <option value="">— No package —</option>
                {packagesList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.base_price_cents != null ? ` · £${(p.base_price_cents / 100).toFixed(0)}` : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {form.event_date ? (
            <div className="admin-bkd-quick-advisory">
              <AdminDateAvailabilityAdvisory
                date={form.event_date}
                excludeBookingId={bookingId}
                selectedSlotKey={form.event_slot_key}
                thisBookingHolds={thisBookingHolds}
              />
            </div>
          ) : null}
        </div>

        <div className="admin-bkd-quick-block">
          <h3 className="admin-bkd-quick-block-title">Money</h3>
          <div className="admin-bkd-quick-grid admin-bkd-quick-grid--1">
            <label className="admin-bkd-quick-field admin-bkd-quick-field--money">
              <span>Contract total (£)</span>
              <div className="admin-bkd-pound">
                <span className="admin-bkd-pound-prefix">£</span>
                <input
                  className="admin-bk-simple-input"
                  inputMode="decimal"
                  value={totalPounds}
                  onChange={(e) => setTotalPounds(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </label>
          </div>
        </div>

        <details className="admin-bkd-quick-more" open>
          <summary>More — deposit, notes &amp; status</summary>
          <div className="admin-bkd-quick-more-body">
            <div className="admin-bkd-quick-grid admin-bkd-quick-grid--2">
              <label className="admin-bkd-quick-field admin-bkd-quick-field--money">
                <span>Deposit (£)</span>
                <div className="admin-bkd-pound">
                  <span className="admin-bkd-pound-prefix">£</span>
                  <input inputMode="decimal" value={depositPounds} onChange={(e) => setDepositPounds(e.target.value)} placeholder="0.00" />
                </div>
              </label>
              <label className="admin-bkd-quick-field admin-bkd-quick-field--money">
                <span>Balance (£)</span>
                <div className="admin-bkd-pound">
                  <span className="admin-bkd-pound-prefix">£</span>
                  <input inputMode="decimal" value={balancePounds} onChange={(e) => setBalancePounds(e.target.value)} placeholder="0.00" />
                </div>
              </label>
            </div>
            <label className="admin-bkd-quick-field admin-bkd-quick-field--full">
              <span>Client requests</span>
              <textarea
                rows={2}
                value={form.special_requirements ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, special_requirements: e.target.value }))}
                placeholder="Catering, access…"
              />
            </label>
            <label className="admin-bkd-quick-field admin-bkd-quick-field--full">
              <span>Internal notes</span>
              <textarea
                rows={2}
                value={form.notes ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Staff only"
              />
            </label>
            <div className="admin-bkd-quick-statuses">
              <span className="admin-bkd-quick-statuses-label">Status</span>
              <div className="admin-bkd-statuses">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={form.status === s ? "admin-bkd-status admin-bkd-status--on" : "admin-bkd-status"}
                    onClick={() => setForm((f) => ({ ...f, status: s }))}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </details>

        <div className="admin-bkd-quick-foot">
          <button type="submit" className="admin-btn admin-btn-primary admin-bkd-quick-save admin-bko-simple-submit" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </section>
  );
}
