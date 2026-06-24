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
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount_cents = poundsToCents(amountPounds);
    if (!amount_cents) {
      await alert("Enter how much they paid, in pounds.");
      return;
    }
    setSaving(true);
    try {
      const r = await adminFetch(`/api/admin/bookings/${bookingId}/record-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount_cents,
          label: "Payment",
          notes: notes.trim() || null,
          sync_milestones: true,
        }),
      });
      if (!r.ok) throw new Error(await parseAdminError(r, "Couldn’t record payment"));
      setAmountPounds("");
      setNotes("");
      onRecorded();
      await alert(`Recorded £${(amount_cents / 100).toFixed(2)}`);
    } catch (err) {
      await alert(err instanceof Error ? err.message : "Couldn’t record payment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="admin-bko-quick-pay admin-bko-quick-pay--simple" onSubmit={submit}>
      <div className="admin-bko-quick-pay-row admin-bko-quick-pay-row--simple">
        <div className="admin-form-group admin-bko-simple-field">
          <label>How much did they pay? (£)</label>
          <input
            type="text"
            inputMode="decimal"
            className="admin-bko-simple-input"
            value={amountPounds}
            onChange={(e) => setAmountPounds(e.target.value)}
            placeholder="e.g. 500.00"
          />
        </div>
      </div>
      {(depositCents && depositCents > 0) || (instalmentCents && instalmentCents > 0) || (totalCents && totalCents > 0) ? (
        <div className="admin-bko-quick-pay-actions">
          {depositCents && depositCents > 0 ? (
            <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setAmountPounds(centsToPounds(depositCents))}>
              Deposit ({centsToPounds(depositCents)})
            </button>
          ) : null}
          {instalmentCents && instalmentCents > 0 ? (
            <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setAmountPounds(centsToPounds(instalmentCents))}>
              25% ({centsToPounds(instalmentCents)})
            </button>
          ) : null}
          {totalCents && totalCents > 0 ? (
            <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setAmountPounds(centsToPounds(totalCents))}>
              Full amount ({centsToPounds(totalCents)})
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="admin-form-group admin-form-full" style={{ marginTop: "0.5rem" }}>
        <label>Note (optional)</label>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Cash, bank transfer, etc." />
      </div>
      <button type="submit" className="admin-btn admin-btn-primary admin-bko-simple-submit" disabled={saving}>
        {saving ? "Saving…" : "Record payment"}
      </button>
    </form>
  );
}
