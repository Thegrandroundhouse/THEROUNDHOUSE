"use client";

import { useState } from "react";
import { adminFetch, parseAdminError } from "@/lib/admin-api-client";
import { useAdminDialog } from "@/components/admin/AdminDialogContext";

function poundsToCents(s: string): number | null {
  const t = s.trim().replace(/[^0-9.]/g, "");
  if (!t) return null;
  const n = parseFloat(t);
  if (Number.isNaN(n) || n <= 0) return null;
  return Math.round(n * 100);
}

function centsToPounds(c: number | null | undefined): string {
  if (c == null || c <= 0) return "";
  return (c / 100).toFixed(2);
}

export function BookingQuickPaymentForm({
  bookingId,
  depositCents,
  totalCents,
  instalmentCents,
  onRecorded,
}: {
  bookingId: string;
  depositCents: number | null;
  totalCents: number | null;
  instalmentCents?: number | null;
  onRecorded: () => void;
}) {
  const { alert } = useAdminDialog();
  const [amountPounds, setAmountPounds] = useState("");
  const [label, setLabel] = useState("Deposit");
  const [notes, setNotes] = useState("");
  const [syncMilestones, setSyncMilestones] = useState(true);
  const [saving, setSaving] = useState(false);

  const fillDeposit = () => {
    if (depositCents && depositCents > 0) {
      setAmountPounds(centsToPounds(depositCents));
      setLabel("Deposit");
    }
  };

  const fillInstalment = () => {
    if (instalmentCents && instalmentCents > 0) {
      setAmountPounds(centsToPounds(instalmentCents));
      setLabel("On booking confirmation (25%)");
    }
  };

  const fillTotal = () => {
    if (totalCents && totalCents > 0) {
      setAmountPounds(centsToPounds(totalCents));
      setLabel("Full hall hire");
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount_cents = poundsToCents(amountPounds);
    if (!amount_cents) {
      await alert("Enter a valid amount in pounds.");
      return;
    }
    setSaving(true);
    try {
      const r = await adminFetch(`/api/admin/bookings/${bookingId}/record-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount_cents,
          label: label.trim() || "Payment",
          notes: notes.trim() || null,
          sync_milestones: syncMilestones,
        }),
      });
      if (!r.ok) throw new Error(await parseAdminError(r, "Couldn’t record payment"));
      setAmountPounds("");
      setNotes("");
      onRecorded();
      await alert(`Recorded ${label} — £${(amount_cents / 100).toFixed(2)}`);
    } catch (err) {
      await alert(err instanceof Error ? err.message : "Couldn’t record payment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="admin-bko-quick-pay" onSubmit={submit}>
      <p className="admin-bko-card-meta" style={{ marginTop: 0 }}>
        Record money received — updates the ledger. With the checkbox on, hire-contract instalments (4×25%) are
        created if needed and marked paid in order.
      </p>
      <div className="admin-bko-quick-pay-row">
        <div className="admin-form-group">
          <label>Amount (£)</label>
          <input
            type="text"
            inputMode="decimal"
            value={amountPounds}
            onChange={(e) => setAmountPounds(e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div className="admin-form-group">
          <label>Label</label>
          <select value={label} onChange={(e) => setLabel(e.target.value)}>
            <option value="Deposit">Deposit</option>
            <option value="On booking confirmation (25%)">On booking confirmation (25%)</option>
            <option value="Instalment">Instalment</option>
            <option value="Full hall hire">Full hall hire</option>
            <option value="Balance">Balance</option>
            <option value="Payment">Other payment</option>
          </select>
        </div>
      </div>
      <div className="admin-bko-quick-pay-actions">
        {depositCents && depositCents > 0 ? (
          <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={fillDeposit}>
            Use deposit ({centsToPounds(depositCents)})
          </button>
        ) : null}
        {instalmentCents && instalmentCents > 0 ? (
          <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={fillInstalment}>
            Use 25% instalment ({centsToPounds(instalmentCents)})
          </button>
        ) : null}
        {totalCents && totalCents > 0 ? (
          <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={fillTotal}>
            Use full total ({centsToPounds(totalCents)})
          </button>
        ) : null}
      </div>
      <label className="admin-hire-settings-item-check admin-bko-quick-pay-check">
        <input type="checkbox" checked={syncMilestones} onChange={(e) => setSyncMilestones(e.target.checked)} />
        <span>Mark hire contract instalments as paid (creates 4×25% schedule if missing)</span>
      </label>
      <div className="admin-form-group admin-form-full" style={{ marginTop: "0.5rem" }}>
        <label>Notes (optional)</label>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Bank transfer ref, cash, etc." />
      </div>
      <button type="submit" className="admin-btn admin-btn-primary admin-btn-sm" disabled={saving} style={{ marginTop: "0.65rem" }}>
        {saving ? "Recording…" : "Record payment"}
      </button>
    </form>
  );
}
