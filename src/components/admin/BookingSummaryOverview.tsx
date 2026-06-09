"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Booking } from "@/types/crm";
import { AdminDateAvailabilityAdvisory } from "@/components/admin/AdminDateAvailabilityAdvisory";
import { BookingQuickPaymentForm } from "@/components/admin/BookingQuickPaymentForm";

type PackageDetail = {
  id: string;
  name: string;
};

type PaymentsSummary = {
  totals: { customer_received: number; milestone_pending: number };
  milestones: { id: string; label: string; amount_cents: number | null; status: string; due_date: string | null }[];
};

const MILESTONE_STATUS_OPTS: { value: string; label: string }[] = [
  { value: "pending", label: "Not paid" },
  { value: "partial", label: "Partial" },
  { value: "paid", label: "Paid" },
  { value: "refunded", label: "Refunded" },
  { value: "waived", label: "Waived" },
];

function formatPounds(cents: number | null) {
  if (cents == null) return "—";
  return "£" + (cents / 100).toFixed(2);
}

function formatDue(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso + "T12:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function parseAmtCents(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Math.round(parseFloat(t.replace(/[^0-9.]/g, "")) * 100);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function statusLabel(status: string) {
  return MILESTONE_STATUS_OPTS.find((o) => o.value === status)?.label ?? status;
}

function statusClass(status: string) {
  if (status === "paid") return "admin-bks-row-status--paid";
  if (status === "partial") return "admin-bks-row-status--partial";
  if (status === "refunded" || status === "waived") return "admin-bks-row-status--muted";
  return "admin-bks-row-status--pending";
}

export function BookingSummaryOverview({
  bookingId,
  booking,
  form,
  thisBookingHolds,
  totalPounds,
  depositPounds,
  balancePounds,
  poundsInputToCents,
  paymentsSummary,
  instalmentCents,
  milestoneDraft,
  milestoneLabel,
  milestoneAmt,
  milestoneDue,
  milestoneUpdating,
  setMilestoneDraft,
  setMilestoneLabel,
  setMilestoneAmt,
  setMilestoneDue,
  saveMilestoneRow,
  markMilestonePaid,
  setupPaymentsLoading,
  setupPaymentsSchedule,
  onPaymentRecorded,
  packageDetail,
}: {
  bookingId: string;
  booking: Booking;
  form: Partial<Booking>;
  thisBookingHolds: { mode: "whole_day" | "slot"; label: string; timeLabel?: string; slotKey?: string };
  totalPounds: string;
  depositPounds: string;
  balancePounds: string;
  poundsInputToCents: (s: string) => number | null;
  paymentsSummary: PaymentsSummary | null;
  instalmentCents: number | null;
  milestoneDraft: Record<string, string>;
  milestoneLabel: Record<string, string>;
  milestoneAmt: Record<string, string>;
  milestoneDue: Record<string, string>;
  milestoneUpdating: string | null;
  setMilestoneDraft: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setMilestoneLabel: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setMilestoneAmt: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setMilestoneDue: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  saveMilestoneRow: (
    m: PaymentsSummary["milestones"][0]
  ) => Promise<{ ok: true; message: string } | { ok: false; message: string }>;
  markMilestonePaid: (
    m: PaymentsSummary["milestones"][0]
  ) => Promise<{ ok: true; message: string } | { ok: false; message: string }>;
  setupPaymentsLoading: boolean;
  setupPaymentsSchedule: () => void;
  onPaymentRecorded: () => void;
  packageDetail: PackageDetail | null;
}) {
  const totalCents = poundsInputToCents(totalPounds) ?? booking.total_cents ?? null;
  const depositCents = poundsInputToCents(depositPounds) ?? booking.deposit_cents ?? null;
  const balanceCents = poundsInputToCents(balancePounds) ?? booking.balance_cents ?? null;
  const collected = paymentsSummary?.totals.customer_received ?? 0;
  const collectPct =
    totalCents != null && totalCents > 0 ? Math.min(100, Math.round((collected / totalCents) * 100)) : 0;

  const packageName = form.package_name || packageDetail?.name;
  const hasNotes = Boolean(form.special_requirements || form.notes);
  const milestones = paymentsSummary?.milestones ?? [];

  const [rowFlash, setRowFlash] = useState<Record<string, { type: "ok" | "err"; msg: string }>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const flashTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    return () => {
      for (const t of Object.values(flashTimers.current)) clearTimeout(t);
    };
  }, []);

  const showRowFlash = (id: string, type: "ok" | "err", msg: string) => {
    if (flashTimers.current[id]) clearTimeout(flashTimers.current[id]);
    setRowFlash((f) => ({ ...f, [id]: { type, msg } }));
    flashTimers.current[id] = setTimeout(() => {
      setRowFlash((f) => {
        const next = { ...f };
        delete next[id];
        return next;
      });
    }, 4500);
  };

  const handleSave = async (m: PaymentsSummary["milestones"][0]) => {
    const result = await saveMilestoneRow(m);
    showRowFlash(m.id, result.ok ? "ok" : "err", result.message);
    if (result.ok) setEditingId(null);
  };

  const handleMarkPaid = async (m: PaymentsSummary["milestones"][0]) => {
    const result = await markMilestonePaid(m);
    showRowFlash(m.id, result.ok ? "ok" : "err", result.message);
    if (result.ok) setEditingId(null);
  };

  const resetRow = (m: PaymentsSummary["milestones"][0]) => {
    setMilestoneLabel((x) => ({ ...x, [m.id]: m.label }));
    setMilestoneAmt((x) => ({
      ...x,
      [m.id]: m.amount_cents != null ? (m.amount_cents / 100).toFixed(2) : "",
    }));
    setMilestoneDue((x) => ({ ...x, [m.id]: m.due_date || "" }));
    setMilestoneDraft((x) => ({ ...x, [m.id]: m.status }));
    setRowFlash((f) => {
      const next = { ...f };
      delete next[m.id];
      return next;
    });
    setEditingId(null);
  };

  return (
    <div className="admin-bks admin-bks--simple">
      <section className="admin-bks-facts" aria-label="Booking facts">
        <div className="admin-bks-fact">
          <span className="admin-bks-fact-label">Venue slot</span>
          <span className="admin-bks-fact-value">
            {thisBookingHolds.label}
            {thisBookingHolds.timeLabel ? ` · ${thisBookingHolds.timeLabel}` : ""}
          </span>
        </div>
        {packageName ? (
          <div className="admin-bks-fact">
            <span className="admin-bks-fact-label">Package</span>
            <span className="admin-bks-fact-value">
              {packageDetail ? (
                <Link href={`/admin/packages/${packageDetail.id}`} className="admin-bks-inline-link">
                  {packageName}
                </Link>
              ) : (
                packageName
              )}
            </span>
          </div>
        ) : null}
        {form.client_phone ? (
          <div className="admin-bks-fact">
            <span className="admin-bks-fact-label">Phone</span>
            <a href={`tel:${form.client_phone}`} className="admin-bks-fact-value admin-bks-inline-link">
              {form.client_phone}
            </a>
          </div>
        ) : null}
        <div className="admin-bks-fact admin-bks-fact--money">
          <span className="admin-bks-fact-label">Money</span>
          <span className="admin-bks-fact-value">
            Total {formatPounds(totalCents)}
            <span className="admin-bks-fact-sep">·</span>
            Deposit {formatPounds(depositCents)}
            <span className="admin-bks-fact-sep">·</span>
            Balance {formatPounds(balanceCents)}
          </span>
        </div>
      </section>

      {form.event_date ? (
        <section className="admin-bks-block">
          <h3 className="admin-bks-block-title">Is this date still free?</h3>
          <AdminDateAvailabilityAdvisory
            date={form.event_date}
            excludeBookingId={bookingId}
            selectedSlotKey={form.event_slot_key}
            thisBookingHolds={thisBookingHolds}
          />
        </section>
      ) : null}

      <section className="admin-bks-block admin-bks-block--pay">
        <div className="admin-bks-block-head">
          <h3 className="admin-bks-block-title">Payments</h3>
          <Link href={`/admin/payments/booking/${bookingId}`} className="admin-bks-inline-link">
            Full ledger →
          </Link>
        </div>

        {totalCents != null && totalCents > 0 ? (
          <div className="admin-bks-collect">
            <div className="admin-bks-collect-text">
              <strong>{formatPounds(collected)}</strong> collected of {formatPounds(totalCents)}
              <span className="admin-bks-collect-pct">{collectPct}%</span>
            </div>
            <div className="admin-bks-progress-track" role="presentation">
              <div className="admin-bks-progress-fill" style={{ width: `${collectPct}%` }} />
            </div>
          </div>
        ) : null}

        <div className="admin-bks-subsection">
          <h4 className="admin-bks-subsection-title">Record a payment</h4>
          <BookingQuickPaymentForm
            bookingId={bookingId}
            depositCents={depositCents}
            totalCents={totalCents}
            instalmentCents={instalmentCents}
            onRecorded={onPaymentRecorded}
          />
        </div>

        {milestones.length > 0 ? (
          <div className="admin-bks-subsection admin-bks-subsection--instalments">
            <div className="admin-bks-subsection-head">
              <h4 className="admin-bks-subsection-title">Hire contract instalments</h4>
              <span className="admin-bks-subsection-meta">{milestones.length} payments</span>
            </div>
            <ul className="admin-bks-instalments">
              {milestones.map((m, index) => {
                const curStatus = milestoneDraft[m.id] ?? m.status;
                const curLabel = milestoneLabel[m.id] ?? m.label;
                const curAmt = milestoneAmt[m.id] ?? "";
                const curDue = milestoneDue[m.id] ?? "";
                const amtCents = parseAmtCents(curAmt);
                const dirty =
                  curStatus !== m.status ||
                  curLabel.trim() !== m.label ||
                  amtCents !== m.amount_cents ||
                  (curDue || "") !== (m.due_date || "");
                const isEditing = editingId === m.id || dirty;
                const flash = rowFlash[m.id];
                const busy = milestoneUpdating === m.id;
                const displayAmt = isEditing ? curAmt : m.amount_cents != null ? (m.amount_cents / 100).toFixed(2) : "";
                const displayLabel = isEditing ? curLabel : m.label;
                const displayDue = isEditing ? curDue : m.due_date || "";

                return (
                  <li
                    key={m.id}
                    className={`admin-bks-instalment admin-bks-instalment--${curStatus}${isEditing ? " admin-bks-instalment--open" : ""}${dirty ? " admin-bks-instalment--dirty" : ""}`}
                  >
                    <div className="admin-bks-instalment-view">
                      <div className="admin-bks-instalment-main">
                        <span className="admin-bks-instalment-num" aria-hidden>
                          {index + 1}
                        </span>
                        <div className="admin-bks-instalment-copy">
                          <strong className="admin-bks-instalment-label">{displayLabel}</strong>
                          <span className="admin-bks-instalment-meta">
                            {displayAmt ? `£${displayAmt}` : "—"}
                            {displayDue ? ` · due ${formatDue(displayDue)}` : ""}
                          </span>
                        </div>
                        <span className={`admin-bks-row-status ${statusClass(curStatus)}`}>{statusLabel(curStatus)}</span>
                      </div>
                      {!isEditing ? (
                        <div className="admin-bks-instalment-toolbar">
                          <button
                            type="button"
                            className="admin-btn admin-btn-ghost admin-btn-sm"
                            onClick={() => setEditingId(m.id)}
                          >
                            Edit
                          </button>
                          {curStatus !== "paid" ? (
                            <button
                              type="button"
                              className="admin-btn admin-btn-ghost admin-btn-sm admin-bks-instalment-mark"
                              disabled={busy}
                              onClick={() => handleMarkPaid(m)}
                            >
                              Mark paid
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    {isEditing ? (
                      <div className="admin-bks-instalment-edit">
                        <label className="admin-bks-field">
                          <span>Label</span>
                          <input
                            type="text"
                            className="admin-bks-input"
                            value={curLabel}
                            onChange={(e) => setMilestoneLabel((x) => ({ ...x, [m.id]: e.target.value }))}
                          />
                        </label>
                        <div className="admin-bks-field-grid">
                          <label className="admin-bks-field">
                            <span>Amount (£)</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              className="admin-bks-input admin-bks-input--money"
                              placeholder="0.00"
                              value={curAmt}
                              onChange={(e) => setMilestoneAmt((x) => ({ ...x, [m.id]: e.target.value }))}
                            />
                          </label>
                          <label className="admin-bks-field">
                            <span>Due date</span>
                            <input
                              type="date"
                              className="admin-bks-input"
                              value={curDue}
                              onChange={(e) => setMilestoneDue((x) => ({ ...x, [m.id]: e.target.value }))}
                            />
                          </label>
                          <label className="admin-bks-field">
                            <span>Status</span>
                            <select
                              className="admin-bks-input admin-bks-input--select"
                              value={curStatus}
                              onChange={(e) => setMilestoneDraft((d) => ({ ...d, [m.id]: e.target.value }))}
                            >
                              {MILESTONE_STATUS_OPTS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <div className="admin-bks-instalment-actions">
                          <button
                            type="button"
                            className="admin-btn admin-btn-primary admin-btn-sm"
                            disabled={!dirty || busy}
                            onClick={() => handleSave(m)}
                          >
                            {busy ? "Saving…" : "Save changes"}
                          </button>
                          <button
                            type="button"
                            className="admin-btn admin-btn-ghost admin-btn-sm"
                            disabled={busy}
                            onClick={() => resetRow(m)}
                          >
                            Cancel
                          </button>
                          {curStatus !== "paid" ? (
                            <button
                              type="button"
                              className="admin-btn admin-btn-ghost admin-btn-sm admin-bks-instalment-mark"
                              disabled={busy}
                              onClick={() => handleMarkPaid(m)}
                            >
                              Mark paid
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    {flash ? (
                      <p
                        className={`admin-bks-instalment-flash admin-bks-instalment-flash--${flash.type}`}
                        role={flash.type === "err" ? "alert" : "status"}
                      >
                        {flash.msg}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : paymentsSummary ? (
          <div className="admin-bks-empty">
            <p>No payment schedule yet. Create the hire contract 4×25% instalments, or record a payment above.</p>
            <button
              type="button"
              className="admin-btn admin-btn-primary admin-btn-sm"
              disabled={setupPaymentsLoading}
              onClick={setupPaymentsSchedule}
            >
              {setupPaymentsLoading ? "Creating…" : "Create payment schedule"}
            </button>
          </div>
        ) : (
          <p className="admin-bks-empty-text">Payment data couldn&apos;t load — refresh the page.</p>
        )}
      </section>

      {hasNotes ? (
        <section className="admin-bks-block">
          <h3 className="admin-bks-block-title">Notes</h3>
          {form.special_requirements ? (
            <p className="admin-bks-note">
              <strong>Client requests:</strong> {form.special_requirements}
            </p>
          ) : null}
          {form.notes ? (
            <p className="admin-bks-note">
              <strong>Internal:</strong> {form.notes}
            </p>
          ) : null}
        </section>
      ) : null}

      <nav className="admin-bks-links" aria-label="Related">
        {booking.enquiry_id ? (
          <Link href={`/admin/enquiries/${booking.enquiry_id}`}>Enquiry</Link>
        ) : null}
        {(form.event_date || booking.event_date) &&
        /^\d{4}-\d{2}-\d{2}$/.test(String(form.event_date || booking.event_date)) ? (
          <Link href={`/admin/calendar?date=${form.event_date || booking.event_date}`}>Calendar</Link>
        ) : null}
        <Link href="/admin/invoices">Invoices</Link>
      </nav>
    </div>
  );
}
