"use client";

import { useState, useEffect } from "react";
import { adminFetch } from "@/lib/admin-api-client";

type Props = {
  open: boolean;
  onClose: () => void;
  bookingId?: string | null;
  invoiceId?: string | null;
  onCreated?: () => void;
};

export function SetReminderModal({ open, onClose, bookingId, invoiceId, onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [remindAt, setRemindAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    const now = new Date();
    setRemindAt(
      now.getFullYear() +
        "-" +
        String(now.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(now.getDate()).padStart(2, "0") +
        "T" +
        String(now.getHours()).padStart(2, "0") +
        ":" +
        String(now.getMinutes()).padStart(2, "0"),
    );
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) {
      setError("Title is required");
      return;
    }
    const dt = new Date(remindAt);
    if (Number.isNaN(dt.getTime())) {
      setError("Valid date and time required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: t,
          body: body.trim() || null,
          remind_at: dt.toISOString(),
          ...(bookingId && { booking_id: bookingId }),
          ...(invoiceId && { invoice_id: invoiceId }),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        const msg =
          res.status === 403
            ? "You need admin or staff access to create reminders. Try signing out and back in."
            : j.error || "Failed to create reminder";
        setError(msg);
        return;
      }
      setTitle("");
      setBody("");
      onClose();
      onCreated?.();
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="admin-bko-export-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="set-reminder-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="admin-bko-export-modal admin-rem-modal" onClick={(e) => e.stopPropagation()}>
        <h2 id="set-reminder-title" className="admin-bko-export-head" style={{ marginBottom: "0.5rem" }}>
          Set reminder
        </h2>
        <p className="admin-bko-export-desc" style={{ marginBottom: "1rem" }}>
          {bookingId && "This reminder will be linked to this booking."}
          {invoiceId && !bookingId && "This reminder will be linked to this invoice."}
        </p>
        <form onSubmit={handleSubmit}>
          <label className="admin-rem-label">
            Title <span className="admin-rem-required">*</span>
          </label>
          <input
            type="text"
            className="admin-bk-search"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Chase deposit"
            required
            autoFocus
          />
          <label className="admin-rem-label">Note (optional)</label>
          <textarea
            className="admin-bk-search"
            rows={2}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Extra details"
          />
          <label className="admin-rem-label">
            Date & time <span className="admin-rem-required">*</span>
          </label>
          <input
            type="datetime-local"
            className="admin-bk-search"
            value={remindAt}
            onChange={(e) => setRemindAt(e.target.value)}
            required
          />
          {error && (
            <p className="admin-bk-error-msg" style={{ marginTop: "0.5rem" }} role="alert">
              {error}
            </p>
          )}
          <div className="admin-rem-form-actions" style={{ marginTop: "1rem" }}>
            <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Create reminder"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
