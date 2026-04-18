"use client";

import type { ReactNode } from "react";

export type CrmExportDateMode = "all" | "year" | "range" | "from_today";

type ColumnItem<K extends string> = { key: K; label: string };

type Props<K extends string> = {
  open: boolean;
  onClose: () => void;
  title: string;
  titleId: string;
  description: string;
  exportFormat: "pdf" | "csv";
  setExportFormat: (f: "pdf" | "csv") => void;
  dateModes: { mode: CrmExportDateMode; label: string }[];
  exportDateMode: CrmExportDateMode;
  setExportDateMode: (m: string) => void;
  exportYear: string;
  setExportYear: (v: string) => void;
  exportDateFrom: string;
  setExportDateFrom: (v: string) => void;
  exportDateTo: string;
  setExportDateTo: (v: string) => void;
  statusSlot?: ReactNode;
  columnLabels: ColumnItem<K>[];
  columns: Record<K, boolean>;
  setColumns: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  onSelectAll: () => void;
  onClearAll: () => void;
  exportCounting: boolean;
  exportingDownload: boolean;
  onContinue: () => void | Promise<void>;
  continueDisabled?: boolean;
};

export function AdminCrmExportModal<K extends string>({
  open,
  onClose,
  title,
  titleId,
  description,
  exportFormat,
  setExportFormat,
  dateModes,
  exportDateMode,
  setExportDateMode,
  exportYear,
  setExportYear,
  exportDateFrom,
  setExportDateFrom,
  exportDateTo,
  setExportDateTo,
  statusSlot,
  columnLabels,
  columns,
  setColumns,
  onSelectAll,
  onClearAll,
  exportCounting,
  exportingDownload,
  onContinue,
  continueDisabled,
}: Props<K>) {
  if (!open) return null;
  return (
    <div className="admin-bko-export-backdrop admin-bko-export-backdrop--wide" role="dialog" aria-modal aria-labelledby={titleId}>
      <div className="admin-bko-export-modal admin-bko-export-modal--wide admin-rem-modal">
        <div className="admin-bko-export-head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="admin-inv-modal-x" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <p className="admin-bko-export-desc">{description}</p>
        <div className="admin-crm-export-controls">
          <div className="admin-bko-export-format" role="group" aria-label="Export format">
            <button
              type="button"
              className={`admin-bko-export-format-btn${exportFormat === "pdf" ? " admin-bko-export-format-btn--active" : ""}`}
              onClick={() => setExportFormat("pdf")}
            >
              PDF
            </button>
            <button
              type="button"
              className={`admin-bko-export-format-btn${exportFormat === "csv" ? " admin-bko-export-format-btn--active" : ""}`}
              onClick={() => setExportFormat("csv")}
            >
              CSV
            </button>
          </div>
          <div className="admin-bko-export-date-modes" role="group" aria-label="Date scope">
            {dateModes.map(({ mode, label }) => (
              <button
                key={mode}
                type="button"
                className={`admin-bko-export-date-mode${exportDateMode === mode ? " admin-bko-export-date-mode--on" : ""}`}
                onClick={() => setExportDateMode(mode)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="admin-form-grid admin-bko-export-filters-grid" style={{ marginBottom: "1rem" }}>
            {exportDateMode === "year" ? (
            <div className="admin-form-group">
              <label>Year</label>
              <select value={exportYear} onChange={(e) => setExportYear(e.target.value)} className="admin-table-select">
                <option value="">Select year</option>
                {[new Date().getFullYear(), new Date().getFullYear() + 1, new Date().getFullYear() - 1].map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {exportDateMode === "range" ? (
            <>
              <div className="admin-form-group">
                <label>From</label>
                <input
                  type="date"
                  className="admin-table-select"
                  style={{ width: "100%" }}
                  value={exportDateFrom}
                  onChange={(e) => setExportDateFrom(e.target.value)}
                />
              </div>
              <div className="admin-form-group">
                <label>To</label>
                <input
                  type="date"
                  className="admin-table-select"
                  style={{ width: "100%" }}
                  value={exportDateTo}
                  onChange={(e) => setExportDateTo(e.target.value)}
                />
              </div>
            </>
          ) : null}
            {statusSlot}
          </div>
        </div>
        <p className="admin-bko-export-desc" style={{ marginBottom: "0.5rem" }}>
          Include in export:
        </p>
        <div className="admin-bko-export-actions-bar" style={{ marginBottom: "0.5rem" }}>
          <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={onSelectAll}>
            Select all
          </button>
          <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={onClearAll}>
            Clear all
          </button>
        </div>
        <ul className="admin-bko-export-list">
          {columnLabels.map(({ key, label }) => (
            <li key={key}>
              <label className="admin-bko-export-item">
                <input
                  type="checkbox"
                  checked={columns[key]}
                  onChange={(e) => setColumns((s) => ({ ...s, [key]: e.target.checked } as Record<K, boolean>))}
                />
                <span className="admin-bko-export-label">{label}</span>
              </label>
            </li>
          ))}
        </ul>
        <div className="admin-inv-modal-actions">
          <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            disabled={exportingDownload || exportCounting || continueDisabled}
            onClick={() => void onContinue()}
          >
            {exportCounting ? "Checking…" : exportingDownload ? (exportFormat === "pdf" ? "Generating PDF…" : "Exporting CSV…") : "Continue…"}
          </button>
        </div>
      </div>
    </div>
  );
}
