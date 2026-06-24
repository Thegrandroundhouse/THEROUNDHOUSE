"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { adminFetch, parseAdminError } from "@/lib/admin-api-client";
import { composeAgreementEmail, mailtoAgreementLink } from "@/lib/agreement-email-compose";

export type SendAgreementEmailDefaults = {
  clientName: string;
  clientEmail: string;
  eventDateLabel: string;
  bookingCode?: string | null;
  agreementTitle: string;
  venueName?: string;
  venuePhone?: string;
  venueEmail?: string;
  salesRep?: string;
  totalGbp?: string;
};

export function SendAgreementEmailModal({
  open,
  onClose,
  bookingId,
  agreementId,
  defaults,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  agreementId: string;
  defaults: SendAgreementEmailDefaults;
  onSent?: () => void;
}) {
  const composed = useMemo(() => composeAgreementEmail(defaults), [defaults]);
  const [to, setTo] = useState(defaults.clientEmail);
  const [subject, setSubject] = useState(composed.subject);
  const [message, setMessage] = useState(composed.text);
  const [includePdf, setIncludePdf] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);

  useEffect(() => {
    if (!open) return;
    const c = composeAgreementEmail(defaults);
    setTo(defaults.clientEmail);
    setSubject(c.subject);
    setMessage(c.text);
    setIncludePdf(true);
    setError(null);
    setNotConfigured(false);
  }, [open, defaults]);

  if (!open) return null;

  const mailto = mailtoAgreementLink(to, subject, message);

  const send = async () => {
    setSending(true);
    setError(null);
    setNotConfigured(false);
    try {
      const res = await adminFetch(
        `/api/admin/bookings/${bookingId}/agreements/${agreementId}/send-email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to, subject, message, include_pdf: includePdf }),
        },
      );
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string; configured?: boolean };
        if (res.status === 503 || j.configured === false) {
          setNotConfigured(true);
          setError(j.error || "Server email is not set up yet.");
          return;
        }
        throw new Error(j.error || (await parseAdminError(res, "Could not send email")));
      }
      onSent?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send email");
    } finally {
      setSending(false);
    }
  };

  const downloadPdf = async () => {
    const res = await adminFetch(`/api/admin/bookings/${bookingId}/agreements/${agreementId}/pdf`);
    if (!res.ok) {
      setError(await parseAdminError(res, "Could not download PDF"));
      return;
    }
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${defaults.agreementTitle.replace(/[^a-z0-9-_]/gi, "-").slice(0, 48) || "agreement"}.pdf`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div
      className="admin-bko-export-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="send-agreement-email-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="admin-bko-export-modal admin-rem-modal admin-send-email-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-bko-export-head">
          <h2 id="send-agreement-email-title">Email agreement to client</h2>
          <button type="button" className="admin-inv-modal-x" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <p className="admin-bko-export-desc">
          A professional message is prefilled with the booking details{defaults.salesRep ? ` and sales rep (${defaults.salesRep})` : ""}.
          {includePdf ? " The PDF is attached when you send from the server." : ""}
        </p>

        <div className="admin-form-group">
          <label>
            To <span className="admin-rem-required">*</span>
          </label>
          <input type="email" value={to} onChange={(e) => setTo(e.target.value)} required />
        </div>
        <div className="admin-form-group">
          <label>Subject</label>
          <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div className="admin-form-group">
          <label>Message</label>
          <textarea className="admin-settings-v2-textarea" rows={12} value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>
        <label className="admin-send-email-check">
          <input type="checkbox" checked={includePdf} onChange={(e) => setIncludePdf(e.target.checked)} />
          Attach agreement PDF
        </label>

        {error ? (
          <div className="admin-send-email-fallback" role="alert">
            <p className="admin-bk-error-msg">{error}</p>
            {notConfigured ? (
              <p className="admin-vnd-new-hint">
                Use your own email app instead:{" "}
                <a href={mailto} className="admin-link">
                  Open in Mail
                </a>
                {" · "}
                <button type="button" className="admin-link-btn" onClick={downloadPdf}>
                  Download PDF
                </button>
                {" "}
                then attach it manually. To send from the CRM, add <code>RESEND_API_KEY</code> to your environment.
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="admin-inv-modal-actions">
          <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={downloadPdf}>
            Download PDF
          </button>
          <button type="button" className="admin-btn admin-btn-primary" disabled={sending || !to.trim()} onClick={send}>
            {sending ? "Sending…" : "Send email"}
          </button>
        </div>
        <p className="admin-vnd-new-hint" style={{ marginTop: "0.75rem", marginBottom: 0 }}>
          Venue contact details come from{" "}
          <Link href="/admin/settings" className="admin-link">
            Settings → Business
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
