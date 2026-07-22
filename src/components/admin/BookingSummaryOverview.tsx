"use client";

import Link from "next/link";
import type { Booking } from "@/types/crm";
import { BookingQuickPaymentForm } from "@/components/admin/BookingQuickPaymentForm";
import { BookingLineItemsPanel } from "@/components/admin/BookingLineItemsPanel";
import { bookingMoneyFromLedger } from "@/lib/booking-money-summary";

type PaymentsSummary = {
  totals: { customer_received: number; milestone_pending: number };
  milestones: { id: string; label: string; amount_cents: number | null; status: string; due_date: string | null }[];
};

function formatPounds(cents: number | null) {
  if (cents == null) return "—";
  return "£" + (cents / 100).toFixed(2);
}

export function BookingSummaryOverview({
  bookingId,
  booking,
  form,
  totalPounds,
  depositPounds,
  poundsInputToCents,
  paymentsSummary,
  instalmentCents,
  onPaymentRecorded,
  onOpenPayments,
  packageDetail,
  onContractSumChange,
  onOfferPaymentResync,
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
  onPaymentRecorded: () => void;
  onOpenPayments: () => void;
  packageDetail: { id: string; name: string } | null;
  onContractSumChange?: (contractSumCents: number) => void;
  onOfferPaymentResync?: (contractSumCents: number) => void;
}) {
  const totalCents = poundsInputToCents(totalPounds) ?? booking.total_cents ?? null;
  const depositCents = poundsInputToCents(depositPounds) ?? booking.deposit_cents ?? null;
  const money = bookingMoneyFromLedger(totalCents, paymentsSummary?.totals.customer_received ?? 0);
  const collectPct =
    money.totalCents > 0 ? Math.min(100, Math.round((money.paidCents / money.totalCents) * 100)) : 0;
  const milestones = paymentsSummary?.milestones ?? [];
  const hasNotes = Boolean(form.special_requirements || form.notes);
  const packageName = form.package_name || packageDetail?.name;

  return (
    <div className="admin-bks admin-bks--simple">
      {packageName ? (
        <p className="admin-bks-package-line">
          Package: <strong>{packageName}</strong>
        </p>
      ) : null}
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
        <div className="admin-bks-collect">
          <div className="admin-bks-collect-text">
            <strong>{formatPounds(money.paidCents)}</strong> collected of {formatPounds(money.totalCents)}
            <span className="admin-bks-collect-pct">{collectPct}%</span>
          </div>
          <div className="admin-bks-progress-track" role="presentation">
            <div className="admin-bks-progress-fill" style={{ width: `${collectPct}%` }} />
          </div>
        </div>
      ) : null}

      <BookingLineItemsPanel
        bookingId={bookingId}
        onSumChange={onContractSumChange}
        onOfferPaymentResync={onOfferPaymentResync}
      />

      <section className="admin-bks-block admin-bks-block--pay">
        <h3 className="admin-bks-block-title">Quick payment</h3>
        <BookingQuickPaymentForm
          bookingId={bookingId}
          depositCents={depositCents}
          totalCents={totalCents}
          instalmentCents={instalmentCents}
          onRecorded={onPaymentRecorded}
        />
        <p className="admin-bks-hint">
          {milestones.length > 0 ? (
            <>
              {milestones.length} instalments on the schedule.{" "}
              <button type="button" className="admin-link-btn" onClick={onOpenPayments}>
                Open Payments tab
              </button>{" "}
              to mark paid or edit due dates.
            </>
          ) : (
            <>
              No instalment plan yet.{" "}
              <button type="button" className="admin-link-btn" onClick={onOpenPayments}>
                Set up on Payments tab
              </button>
              .
            </>
          )}
        </p>
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

      <p className="admin-bks-foot">
        <Link href={`/admin/payments/booking/${bookingId}`} className="admin-bks-inline-link">
          Full payment ledger →
        </Link>
      </p>
    </div>
  );
}
