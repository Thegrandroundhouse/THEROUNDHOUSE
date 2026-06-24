"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Booking } from "@/types/crm";
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

  const handleMarkPaid = async (m: PaymentsSummary["milestones"][0]) => {
    const result = await markMilestonePaid(m);
    showRowFlash(m.id, result.ok ? "ok" : "err", result.message);
  };

  return (
    <div className="admin-bks admin-bks--simple">
      <section className="admin-bks-block admin-bks-block--pay">
        <h3 className="admin-bks-block-title">Record a payment</h3>

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

        <BookingQuickPaymentForm
          bookingId={bookingId}
          depositCents={depositCents}
          totalCents={totalCents}
          instalmentCents={instalmentCents}
          onRecorded={onPaymentRecorded}
        />

        {milestones.length > 0 ? (
          <details className="admin-bks-instalments-details">
            <summary className="admin-bks-instalments-summary">
              Payment schedule ({milestones.length} instalments)
            </summary>
            <ul className="admin-bks-instalments admin-bks-instalments--simple">
              {milestones.map((m, index) => {
                const curStatus = milestoneDraft[m.id] ?? m.status;
                const busy = milestoneUpdating === m.id;
                const flash = rowFlash[m.id];

                return (
                  <li key={m.id} className={`admin-bks-instalment admin-bks-instalment--${curStatus}`}>
                    <div className="admin-bks-instalment-view">
                      <div className="admin-bks-instalment-main">
                        <span className="admin-bks-instalment-num" aria-hidden>
                          {index + 1}
                        </span>
                        <div className="admin-bks-instalment-copy">
                          <strong className="admin-bks-instalment-label">{m.label}</strong>
                          <span className="admin-bks-instalment-meta">
                            {m.amount_cents != null ? formatPounds(m.amount_cents) : "—"}
                            {m.due_date ? ` · due ${formatDue(m.due_date)}` : ""}
                          </span>
                        </div>
                        <span className={`admin-bks-row-status ${statusClass(curStatus)}`}>{statusLabel(curStatus)}</span>
                      </div>
                      {curStatus !== "paid" ? (
                        <div className="admin-bks-instalment-toolbar">
                          <button
                            type="button"
                            className="admin-btn admin-btn-ghost admin-btn-sm admin-bks-instalment-mark"
                            disabled={busy}
                            onClick={() => handleMarkPaid(m)}
                          >
                            Mark paid
                          </button>
                        </div>
                      ) : null}
                    </div>
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
            <p className="admin-bks-empty-text" style={{ marginTop: "0.75rem" }}>
              <Link href={`/admin/payments/booking/${bookingId}`} className="admin-bks-inline-link">
                Open full payment ledger →
              </Link>
            </p>
          </details>
        ) : paymentsSummary ? (
          <div className="admin-bks-empty">
            <p>No payment schedule yet. Record a payment above, or create the standard 4-instalment plan.</p>
            <button
              type="button"
              className="admin-btn admin-btn-ghost admin-btn-sm"
              disabled={setupPaymentsLoading}
              onClick={setupPaymentsSchedule}
            >
              {setupPaymentsLoading ? "Creating…" : "Create 4-instalment plan"}
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
              <strong>Client:</strong> {form.special_requirements}
            </p>
          ) : null}
          {form.notes ? (
            <p className="admin-bks-note">
              <strong>Internal:</strong> {form.notes}
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
