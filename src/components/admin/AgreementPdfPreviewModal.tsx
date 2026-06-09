"use client";

import { useEffect, useState } from "react";

export function AgreementPdfPreviewModal({
  open,
  title,
  pdfUrl,
  loading,
  error,
  onClose,
  onDownload,
}: {
  open: boolean;
  title: string;
  pdfUrl: string | null;
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
  onDownload?: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="admin-bko-export-backdrop admin-bko-export-backdrop--wide"
      role="dialog"
      aria-modal
      aria-labelledby="agreement-pdf-preview-title"
    >
      <div className="admin-bko-export-modal admin-bko-export-modal--wide admin-bkd-agreement-preview-modal">
        <div className="admin-bko-export-head admin-bkd-agreement-preview-head">
          <h2 id="agreement-pdf-preview-title">Preview — {title}</h2>
          <button type="button" className="admin-inv-modal-x" onClick={onClose} aria-label="Close preview">
            ×
          </button>
        </div>
        <p className="admin-bko-export-desc admin-bkd-agreement-preview-desc">
          Full-colour PDF preview — same layout as download and print.
        </p>
        <div className="admin-bkd-agreement-preview-body">
          {loading ? (
            <p className="admin-vnd-new-hint">Generating preview…</p>
          ) : error ? (
            <p className="admin-bkd-flash admin-bkd-flash--err" role="alert">
              {error}
            </p>
          ) : pdfUrl ? (
            <div className="admin-agreement-preview-iframe-wrap">
              <iframe title={`PDF preview — ${title}`} className="admin-agreement-preview-iframe" src={pdfUrl} />
            </div>
          ) : (
            <p className="admin-vnd-new-hint">No preview available.</p>
          )}
        </div>
        <div className="admin-inv-modal-actions admin-bkd-agreement-preview-actions">
          <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose}>
            Close
          </button>
          {onDownload ? (
            <button type="button" className="admin-btn admin-btn-primary" disabled={!pdfUrl || loading} onClick={onDownload}>
              Download PDF
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Hook to manage blob URL lifecycle for PDF preview. */
export function useAgreementPdfPreview() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("Agreement");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onDownload, setOnDownload] = useState<(() => void) | undefined>();

  const close = () => {
    setOpen(false);
    setLoading(false);
    setError(null);
    setOnDownload(undefined);
    setPdfUrl((url) => {
      if (url) URL.revokeObjectURL(url);
      return null;
    });
  };

  const showBlob = (blob: Blob, previewTitle: string, download?: () => void) => {
    setPdfUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(blob);
    });
    setTitle(previewTitle);
    setOnDownload(() => download);
    setLoading(false);
    setError(null);
    setOpen(true);
  };

  const showError = (message: string) => {
    setLoading(false);
    setError(message);
    setOpen(true);
  };

  const startLoading = (previewTitle: string) => {
    setTitle(previewTitle);
    setLoading(true);
    setError(null);
    setPdfUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setOpen(true);
  };

  useEffect(() => () => {
    setPdfUrl((url) => {
      if (url) URL.revokeObjectURL(url);
      return null;
    });
  }, []);

  return {
    open,
    title,
    pdfUrl,
    loading,
    error,
    close,
    showBlob,
    showError,
    startLoading,
    onDownload,
  };
}
