"use client";

import Link from "next/link";
import type { Booking } from "@/types/crm";
import { BookingQuickPaymentForm } from "@/components/admin/BookingQuickPaymentForm";
import { bookingMoneyFromLedger } from "@/lib/booking-money-summary";

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

function statusClass(status: string) {
  if (status === "paid") return "admin-bkp-status--paid";
  if (status === "partial") return "admin-bkp-status--partial";
  if (status === "refunded" || status === "waived") return "admin-bkp-status--muted";
  return "admin-bkp-status--pending";
}

export function BookingPaymentsTab({
  bookingId,
  booking,
  totalPounds,
  depositPounds,
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
}: {
  bookingId: string;
  booking: Booking;
  totalPounds: string;
  depositPounds: string;
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
}) {
  const totalCents = poundsInputToCents(totalPounds) ?? booking.total_cents ?? null;
  const depositCents = poundsInputToCents(depositPounds) ?? booking.deposit_cents ?? null;
  const money = bookingMoneyFromLedger(totalCents, paymentsSummary?.totals.customer_received ?? 0);
  const collectPct =
    money.totalCents > 0 ? Math.min(100, Math.round((money.paidCents / money.totalCents) * 100)) : 0;
  const milestones = paymentsSummary?.milestones ?? [];

  return (
    <div className="admin-bkp">
      <div className="admin-money-strip admin-money-strip--lg admin-money-strip--inset">
        <div className="admin-money-strip-stat">
          <span className="admin-money-strip-label">Total</span>
          <strong className="admin-money-strip-val">{formatPounds(money.totalCents)}</strong>
        </div>
        <div className="admin-money-strip-stat admin-money-strip-stat--ok">
          <span className="admin-money-strip-label">Paid</span>
          <strong className="admin-money-strip-val">{formatPounds(money.paidCents)}</strong>
        </div>
        <div className="admin-money-strip-stat admin-money-strip-stat--due">
          <span className="admin-money-strip-label">Still due</span>
          <strong className="admin-money-strip-val">{formatPounds(money.stillDueCents)}</strong>
        </div>
      </div>

      {money.totalCents > 0 ? (
        <div className="admin-bkp-progress" aria-label={`${collectPct}% collected`}>
          <div className="admin-bkp-progress-fill" style={{ width: `${collectPct}%` }} />
        </div>
      ) : null}

      <section className="admin-bkp-section">
        <h3 className="admin-bkp-section-title">Record a payment</h3>
        <BookingQuickPaymentForm
          bookingId={bookingId}
          depositCents={depositCents}
          totalCents={totalCents}
          instalmentCents={instalmentCents}
          onRecorded={onPaymentRecorded}
        />
      </section>

      <section className="admin-bkp-section">
        <div className="admin-bkp-section-head">
          <h3 className="admin-bkp-section-title">Payment schedule</h3>
          <p className="admin-bkp-section-desc">
            Instalments print on the contract PDF. Mark paid or edit amounts and due dates below.
          </p>
        </div>

        {milestones.length > 0 ? (
          <>
            <div className="admin-pay-table-wrap">
              <table className="admin-pay-table admin-bkp-schedule">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Instalment</th>
                    <th>Amount</th>
                    <th>Due</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {milestones.map((m, index) => {
                    const curStatus = milestoneDraft[m.id] ?? m.status;
                    const busy = milestoneUpdating === m.id;
                    return (
                      <tr key={m.id}>
                        <td className="admin-bkp-num">{index + 1}</td>
                        <td>
                          <input
                            className="admin-table-inline-input"
                            value={milestoneLabel[m.id] ?? m.label}
                            onChange={(e) => setMilestoneLabel((d) => ({ ...d, [m.id]: e.target.value }))}
                          />
                        </td>
                        <td>
                          <input
                            className="admin-table-inline-input admin-bkp-amt-input"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={milestoneAmt[m.id] ?? (m.amount_cents != null ? (m.amount_cents / 100).toFixed(2) : "")}
                            onChange={(e) => setMilestoneAmt((d) => ({ ...d, [m.id]: e.target.value }))}
                          />
                        </td>
                        <td>
                          <input
                            type="date"
                            className="admin-table-inline-input"
                            value={milestoneDue[m.id] ?? m.due_date?.slice(0, 10) ?? ""}
                            onChange={(e) => setMilestoneDue((d) => ({ ...d, [m.id]: e.target.value }))}
                          />
                        </td>
                        <td>
                          <select
                            className={`admin-table-select admin-bkp-status ${statusClass(curStatus)}`}
                            value={curStatus}
                            onChange={(e) => setMilestoneDraft((d) => ({ ...d, [m.id]: e.target.value }))}
                          >
                            {MILESTONE_STATUS_OPTS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="admin-bkp-row-actions">
                          {curStatus !== "paid" ? (
                            <button
                              type="button"
                              className="admin-btn admin-btn-ghost admin-btn-sm"
                              disabled={busy}
                              onClick={() => markMilestonePaid(m)}
                            >
                              Mark paid
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="admin-btn admin-btn-primary admin-btn-sm"
                            disabled={busy}
                            onClick={() => saveMilestoneRow(m)}
                          >
                            {busy ? "…" : "Save"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="admin-bkp-footnote">
              Contract total or lines changed?{" "}
              <button
                type="button"
                className="admin-link-btn"
                disabled={setupPaymentsLoading}
                onClick={setupPaymentsSchedule}
              >
                {setupPaymentsLoading ? "Updating…" : "Update 4-instalment plan from contract"}
              </button>
              {" · "}
              <Link href={`/admin/payments/booking/${bookingId}`} className="admin-link">
                Open full payment ledger →
              </Link>
            </p>
          </>
        ) : paymentsSummary ? (
          <div className="admin-bkp-empty">
            <p>No instalment plan yet. Create the standard 4-part schedule (matches the hire contract).</p>
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              disabled={setupPaymentsLoading}
              onClick={setupPaymentsSchedule}
            >
              {setupPaymentsLoading ? "Creating…" : "Create 4-instalment plan"}
            </button>
            <p className="admin-bks-hint" style={{ marginTop: "0.75rem" }}>
              You’ll confirm the line-item breakdown and each 25% payment before it’s created.
            </p>
          </div>
        ) : (
          <p className="admin-bkp-empty-text">Payment data couldn&apos;t load — refresh the page.</p>
        )}
      </section>
    </div>
  );
}
