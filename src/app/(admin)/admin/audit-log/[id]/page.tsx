"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-api-client";

type DisplayRow = { label: string; value: string };

type Entry = {
  id: string;
  actor_user_id: string | null;
  actor_email: string | null;
  actor_display_name: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  booking_id: string | null;
  booking_code?: string | null;
  booking_still_exists?: boolean;
  summary: string;
  payload_before: Record<string, unknown> | null;
  payload_after: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  display_before?: DisplayRow[];
  display_after?: DisplayRow[];
  created_at: string;
};

function formatAction(action: string): string {
  const labels: Record<string, string> = {
    create: "Created",
    update: "Updated",
    delete: "Deleted",
    pdf_generated: "PDF exported",
    payment_recorded: "Payment recorded",
    workspace_update: "Workspace updated",
  };
  return labels[action] || action.replace(/_/g, " ");
}

function formatEntity(type: string): string {
  const labels: Record<string, string> = {
    booking: "Booking",
    vendor: "Vendor",
    enquiry: "Enquiry",
    payment_record: "Payment",
    site_setting: "Settings",
    agreement: "Agreement",
  };
  return labels[type] || type.replace(/_/g, " ");
}

function actionPillClass(action: string): string {
  if (action === "delete") return "admin-audit-pill admin-audit-pill--danger";
  if (action === "create") return "admin-audit-pill admin-audit-pill--ok";
  if (action === "pdf_generated") return "admin-audit-pill admin-audit-pill--muted";
  if (action === "payment_recorded") return "admin-audit-pill admin-audit-pill--gold";
  return "admin-audit-pill";
}

function safeJson(data: unknown, max = 8000): string {
  try {
    const s = JSON.stringify(data, null, 2);
    if (s.length <= max) return s;
    return `${s.slice(0, max)}\n\n… (truncated)`;
  } catch {
    return String(data);
  }
}

function DisplayTable({ rows, title }: { rows: DisplayRow[]; title: string }) {
  if (!rows.length) return null;
  return (
    <div className="admin-audit-detail-json-block">
      <h3 className="admin-audit-detail-sub">{title}</h3>
      <dl className="admin-audit-detail-dl admin-audit-detail-dl--records">
        {rows.map((row) => (
          <div key={`${title}-${row.label}`}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function AuditLogDetailPage() {
  const { id } = useParams() as { id: string };
  const [entry, setEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminFetch(`/api/admin/audit-log/${id}`)
      .then(async (r) => {
        if (r.status === 403) {
          setForbidden(true);
          return;
        }
        if (r.status === 404) {
          setNotFound(true);
          return;
        }
        const data = await r.json();
        setEntry(data);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (forbidden) {
    return (
      <div className="admin-audit-v2">
        <div className="admin-page-banner">
          <header className="admin-bk-hero">
            <div className="admin-bk-hero-text">
              <h1 className="admin-page-title admin-bk-title">Audit log entry</h1>
              <p className="admin-lead admin-bk-lead">Only administrators can view audit log entries.</p>
            </div>
          </header>
        </div>
        <div className="admin-audit-empty-state">
          <Link href="/admin/audit-log" className="admin-btn admin-btn-primary">
            Back to audit log
          </Link>
        </div>
      </div>
    );
  }

  if (notFound || (!loading && !entry)) {
    return (
      <div className="admin-audit-v2">
        <div className="admin-page-banner">
          <header className="admin-bk-hero">
            <div className="admin-bk-hero-text">
              <h1 className="admin-page-title admin-bk-title">Entry not found</h1>
              <p className="admin-lead admin-bk-lead">This record may have been removed or the link is invalid.</p>
            </div>
          </header>
        </div>
        <div className="admin-audit-empty-state">
          <Link href="/admin/audit-log" className="admin-btn admin-btn-primary">
            Back to audit log
          </Link>
        </div>
      </div>
    );
  }

  if (loading || !entry) {
    return (
      <div className="admin-audit-v2">
        <div className="admin-audit-loading" aria-busy="true">
          <p className="admin-settings-loading">Loading entry…</p>
        </div>
      </div>
    );
  }

  const whenFormatted = new Date(entry.created_at).toLocaleString("en-GB", { dateStyle: "long", timeStyle: "medium" });
  const displayBefore = entry.display_before ?? [];
  const displayAfter = entry.display_after ?? [];
  const hasReadable = displayBefore.length > 0 || displayAfter.length > 0;
  const hasRawPayload = entry.payload_before != null || entry.payload_after != null;
  const hasMetadata = entry.metadata != null && Object.keys(entry.metadata).length > 0;
  const isDeletedBooking = entry.action === "delete" && entry.entity_type === "booking";
  const showBookingLink = Boolean(entry.booking_id && entry.booking_still_exists);

  return (
    <div className="admin-audit-v2 admin-audit-detail-page">
      <div className="admin-bkd-top-actions">
        <Link href="/admin/audit-log" className="admin-bkd-back">
          ← Back to audit log
        </Link>
      </div>

      <div className="admin-page-banner">
        <header className="admin-bk-hero admin-audit-detail-banner">
          <div className="admin-bk-hero-text">
            <p className="admin-dash-kicker">Audit entry</p>
            <h1 className="admin-page-title admin-bk-title">{entry.summary || "Entry details"}</h1>
            <p className="admin-lead admin-bk-lead admin-audit-detail-oneline">
              <strong>{entry.actor_display_name}</strong> · {formatAction(entry.action)} · {formatEntity(entry.entity_type)}
              {entry.booking_code ? (
                <>
                  {" "}
                  · <code className="admin-bk-code">{entry.booking_code}</code>
                </>
              ) : null}
            </p>
            <p className="admin-audit-detail-id">Recorded {whenFormatted}</p>
          </div>
          <div className="admin-bk-hero-actions">
            {showBookingLink ? (
              <>
                <Link href={`/admin/bookings/${entry.booking_id}`} className="admin-btn admin-btn-primary">
                  View booking
                </Link>
                <Link href={`/admin/payments/booking/${entry.booking_id}`} className="admin-btn admin-btn-ghost">
                  Payments
                </Link>
              </>
            ) : isDeletedBooking ? (
              <span className="admin-audit-detail-muted admin-audit-deleted-note">Booking no longer exists (was deleted)</span>
            ) : null}
          </div>
        </header>
      </div>

      <div className="admin-audit-detail-glance">
        <span>
          <strong>Who</strong> {entry.actor_display_name}
          {entry.actor_email ? ` (${entry.actor_email})` : ""}
        </span>
        <span>
          <strong>When</strong> {whenFormatted}
        </span>
        <span>
          <strong>Action</strong> <span className={actionPillClass(entry.action)}>{formatAction(entry.action)}</span>
        </span>
        <span>
          <strong>Type</strong> {formatEntity(entry.entity_type)}
        </span>
        {entry.booking_code ? (
          <span>
            <strong>Booking code</strong> <code className="admin-bk-code">{entry.booking_code}</code>
          </span>
        ) : null}
      </div>

      <section className="admin-card admin-audit-detail-section">
        <h2 className="admin-audit-detail-heading">Summary</h2>
        <p className="admin-audit-detail-summary">{entry.summary}</p>
        <dl className="admin-audit-detail-dl">
          <dt>Staff member</dt>
          <dd>
            {entry.actor_display_name}
            {entry.actor_email ? ` · ${entry.actor_email}` : ""}
          </dd>
          {entry.booking_code ? (
            <>
              <dt>Booking code</dt>
              <dd>
                <code className="admin-bk-code">{entry.booking_code}</code>
              </dd>
            </>
          ) : null}
          {entry.entity_type === "enquiry" && entry.entity_id ? (
            <>
              <dt>Enquiry</dt>
              <dd>
                <Link href={`/admin/enquiries/${entry.entity_id}`}>View enquiry</Link>
              </dd>
            </>
          ) : null}
          {showBookingLink ? (
            <>
              <dt>Booking</dt>
              <dd>
                {entry.booking_code ? <code className="admin-bk-code">{entry.booking_code}</code> : null}{" "}
                <Link href={`/admin/bookings/${entry.booking_id}`}>View booking</Link>
              </dd>
            </>
          ) : null}
        </dl>
      </section>

      {hasReadable ? (
        <section className="admin-card admin-audit-detail-section">
          <h2 className="admin-audit-detail-heading">
            {isDeletedBooking ? "Deleted booking details" : "Record details"}
          </h2>
          <p className="admin-audit-detail-muted">
            {isDeletedBooking
              ? "Information captured before the booking was removed."
              : entry.action === "create"
                ? "Details recorded when this item was created."
                : "What was stored at the time of this action."}
          </p>
          {isDeletedBooking && displayBefore.length > 0 ? (
            <DisplayTable rows={displayBefore} title="Booking at time of deletion" />
          ) : (
            <>
              <DisplayTable rows={displayBefore} title="Before" />
              <DisplayTable rows={displayAfter} title="After" />
            </>
          )}
        </section>
      ) : null}

      {hasMetadata ? (
        <section className="admin-card admin-audit-detail-section">
          <h2 className="admin-audit-detail-heading">Extra details</h2>
          <dl className="admin-audit-detail-dl admin-audit-detail-dl--records">
            {Object.entries(entry.metadata!).map(([key, value]) => (
              <div key={key}>
                <dt>{key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</dt>
                <dd>{typeof value === "string" ? value : safeJson(value, 500)}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {hasRawPayload ? (
        <details className="admin-card admin-audit-detail-section admin-audit-detail-technical">
          <summary className="admin-audit-detail-heading" style={{ cursor: "pointer" }}>
            Technical data (for support)
          </summary>
          <p className="admin-audit-detail-muted">Raw JSON captured at the time of the action.</p>
          {entry.payload_before != null ? (
            <div className="admin-audit-detail-json-block">
              <h3 className="admin-audit-detail-sub">Before (raw)</h3>
              <pre className="admin-audit-detail-pre">{safeJson(entry.payload_before)}</pre>
            </div>
          ) : null}
          {entry.payload_after != null ? (
            <div className="admin-audit-detail-json-block">
              <h3 className="admin-audit-detail-sub">After (raw)</h3>
              <pre className="admin-audit-detail-pre">{safeJson(entry.payload_after)}</pre>
            </div>
          ) : null}
          <dl className="admin-audit-detail-dl" style={{ marginTop: "1rem" }}>
            <dt>Record ID</dt>
            <dd>
              <code className="admin-bk-code">{entry.id}</code>
            </dd>
            {entry.entity_id ? (
              <>
                <dt>Entity ID</dt>
                <dd>
                  <code className="admin-bk-code">{entry.entity_id}</code>
                </dd>
              </>
            ) : null}
            {entry.booking_id ? (
              <>
                <dt>Booking ID</dt>
                <dd>
                  <code className="admin-bk-code">{entry.booking_id}</code>
                </dd>
              </>
            ) : null}
          </dl>
        </details>
      ) : null}

      <div className="admin-audit-detail-footer">
        <Link href="/admin/audit-log" className="admin-btn admin-btn-ghost">
          ← Back to audit log
        </Link>
      </div>
    </div>
  );
}
