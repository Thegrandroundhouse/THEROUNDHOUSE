"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { adminFetch, parseAdminError } from "@/lib/admin-api-client";
import { composeAgreementEmail, mailtoAgreementLink } from "@/lib/agreement-email-compose";
import { blobToBase64, buildAgreementEml, openEmlDraft } from "@/lib/build-agreement-eml";
import { useAdminDialog } from "@/components/admin/AdminDialogContext";

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
  const { alert } = useAdminDialog();
  const composed = useMemo(() => composeAgreementEmail(defaults), [defaults]);
  const [to, setTo] = useState(defaults.clientEmail);
  const [subject, setSubject] = useState(composed.subject);
  const [message, setMessage] = useState(composed.text);
  const [includePdf, setIncludePdf] = useState(true);
  const [sending, setSending] = useState(false);
  const [openingLocal, setOpeningLocal] = useState(false);
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

  const pdfFilename = `${defaults.agreementTitle.replace(/[^a-z0-9-_]/gi, "-").slice(0, 48) || "hire-agreement"}.pdf`;
  const emlFilename = `hire-agreement${defaults.bookingCode ? `-${defaults.bookingCode}` : ""}.eml`;

  const fetchPdfBlob = async () => {
    const res = await adminFetch(`/api/admin/bookings/${bookingId}/agreements/${agreementId}/pdf`);
    if (!res.ok) throw new Error(await parseAdminError(res, "Could not load agreement PDF"));
    return res.blob();
  };

  const openInEmailApp = async () => {
    if (!to.trim()) return;
    setOpeningLocal(true);
    setError(null);
    try {
      if (!includePdf) {
        window.location.href = mailto;
        return;
      }

      const blob = await fetchPdfBlob();
      const contentBase64 = await blobToBase64(blob);
      const eml = buildAgreementEml({
        to: to.trim(),
        from: defaults.venueEmail?.trim() || undefined,
        subject,
        body: message,
        attachment: { filename: pdfFilename, contentBase64 },
      });

      const result = await openEmlDraft(eml, emlFilename);
      if (result === "downloaded") {
        await alert(
          "Your email draft was downloaded. Double-click the .eml file in your Downloads folder to open Mail or Outlook with the agreement attached.",
          { title: "Open email draft" },
        );
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Could not open your email app");
    } finally {
      setOpeningLocal(false);
    }
  };

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
    try {
      const blob = await fetchPdfBlob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = pdfFilename;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not download PDF");
    }
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
          {includePdf
            ? " Use Open in Mail / Outlook to compose in your email app with the agreement PDF attached."
            : " Use Open in Mail / Outlook to compose in your email app."}
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
                Server email is not set up — use{" "}
                <button type="button" className="admin-link-btn" onClick={() => void openInEmailApp()}>
                  Open in Mail / Outlook
                </button>
                {" "}instead (includes the PDF). To send from the CRM, add <code>RESEND_API_KEY</code> to your environment.
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="admin-inv-modal-actions">
          <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={() => void downloadPdf()}>
            Download PDF
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            disabled={sending || !to.trim()}
            onClick={() => void send()}
          >
            {sending ? "Sending…" : "Send from CRM"}
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            disabled={openingLocal || !to.trim()}
            onClick={() => void openInEmailApp()}
          >
            {openingLocal ? "Preparing…" : "Open in Mail / Outlook"}
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
