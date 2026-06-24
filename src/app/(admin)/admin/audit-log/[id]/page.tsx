"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-api-client";

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
  summary: string;
  payload_before: Record<string, unknown> | null;
  payload_after: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

function formatAction(action: string): string {
  return action.replace(/_/g, " ");
}

function actionPillClass(action: string): string {
  if (action === "delete") return "admin-audit-pill admin-audit-pill--danger";
  if (action === "create") return "admin-audit-pill admin-audit-pill--ok";
  if (action === "pdf_generated") return "admin-audit-pill admin-audit-pill--muted";
  if (action === "payment_recorded") return "admin-audit-pill admin-audit-pill--gold";
  return "admin-audit-pill";
}

function safeJson(data: unknown, max = 12000): string {
  try {
    const s = JSON.stringify(data, null, 2);
    if (s.length <= max) return s;
    return `${s.slice(0, max)}\n\n… (truncated — too much data to show on screen)`;
  } catch {
    return String(data);
  }
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

  const hasPayload = entry.payload_before != null || entry.payload_after != null;
  const hasMetadata = entry.metadata != null && Object.keys(entry.metadata).length > 0;
  const whenFormatted = new Date(entry.created_at).toLocaleString("en-GB", { dateStyle: "long", timeStyle: "medium" });

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
            <h1 className="admin-page-title admin-bk-title">Entry details</h1>
            <p className="admin-lead admin-bk-lead admin-audit-detail-oneline">
              <strong>{entry.actor_display_name}</strong> {formatAction(entry.action)} · {entry.entity_type.replace(/_/g, " ")}
              {entry.booking_code ? <> · <code className="admin-bk-code">{entry.booking_code}</code></> : null}
            </p>
            <p className="admin-audit-detail-id">
              Recorded {whenFormatted} · ID <code className="admin-bk-code">{entry.id.slice(0, 8)}…</code>
            </p>
          </div>
          <div className="admin-bk-hero-actions">
            {entry.booking_id ? (
              <>
                <Link href={`/admin/bookings/${entry.booking_id}`} className="admin-btn admin-btn-primary">
                  View booking
                </Link>
                <Link href={`/admin/payments/booking/${entry.booking_id}`} className="admin-btn admin-btn-ghost">
                  Payments
                </Link>
              </>
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
          <strong>Type</strong> {entry.entity_type.replace(/_/g, " ")}
        </span>
      </div>

      <section className="admin-card admin-audit-detail-section">
        <h2 className="admin-audit-detail-heading">What happened</h2>
        <p className="admin-audit-detail-summary">{entry.summary}</p>
        <dl className="admin-audit-detail-dl">
          <dt>Action</dt>
          <dd>
            <span className={actionPillClass(entry.action)}>{formatAction(entry.action)}</span>
          </dd>
          <dt>Item type</dt>
          <dd>{entry.entity_type.replace(/_/g, " ")}</dd>
          {entry.entity_id ? (
            <>
              <dt>Item ID</dt>
              <dd>
                <code className="admin-bk-code">{entry.entity_id}</code>
                {entry.entity_type === "enquiry" ? (
                  <>
                    {" "}
                    · <Link href={`/admin/enquiries/${entry.entity_id}`}>View enquiry</Link>
                  </>
                ) : null}
              </dd>
            </>
          ) : null}
          {entry.booking_id ? (
            <>
              <dt>Booking</dt>
              <dd>
                {entry.booking_code ? <code className="admin-bk-code">{entry.booking_code}</code> : null}{" "}
                <Link href={`/admin/bookings/${entry.booking_id}`}>View booking</Link> ·{" "}
                <Link href={`/admin/payments/booking/${entry.booking_id}`}>Payments</Link>
              </dd>
            </>
          ) : null}
        </dl>
      </section>

      <section className="admin-card admin-audit-detail-section">
        <h2 className="admin-audit-detail-heading">What changed (before &amp; after)</h2>
        {hasPayload ? (
          <>
            <p className="admin-audit-detail-muted">Raw data captured at the time of the action — useful for support or debugging.</p>
            {entry.payload_before != null ? (
              <div className="admin-audit-detail-json-block">
                <h3 className="admin-audit-detail-sub">Before</h3>
                <pre className="admin-audit-detail-pre">{safeJson(entry.payload_before)}</pre>
              </div>
            ) : null}
            {entry.payload_after != null ? (
              <div className="admin-audit-detail-json-block">
                <h3 className="admin-audit-detail-sub">After</h3>
                <pre className="admin-audit-detail-pre">{safeJson(entry.payload_after)}</pre>
              </div>
            ) : null}
          </>
        ) : (
          <p className="admin-audit-detail-muted">No before/after data was recorded for this entry.</p>
        )}
      </section>

      {hasMetadata ? (
        <section className="admin-card admin-audit-detail-section">
          <h2 className="admin-audit-detail-heading">Extra data</h2>
          <p className="admin-audit-detail-muted">Additional technical details (e.g. export options, file names).</p>
          <pre className="admin-audit-detail-pre">{safeJson(entry.metadata)}</pre>
        </section>
      ) : null}

      <section className="admin-card admin-audit-detail-section admin-audit-detail-technical">
        <h2 className="admin-audit-detail-heading">All fields</h2>
        <p className="admin-audit-detail-muted">Complete record for support or copying IDs.</p>
        <dl className="admin-audit-detail-dl">
          <dt>Record ID</dt>
          <dd>
            <code className="admin-bk-code">{entry.id}</code>
          </dd>
          <dt>Who (user ID)</dt>
          <dd>
            {entry.actor_user_id ? <code className="admin-bk-code">{entry.actor_user_id}</code> : <span className="admin-audit-detail-muted">—</span>}
          </dd>
          <dt>Email</dt>
          <dd>{entry.actor_email ?? <span className="admin-audit-detail-muted">—</span>}</dd>
          <dt>Display name</dt>
          <dd>{entry.actor_display_name || <span className="admin-audit-detail-muted">—</span>}</dd>
          <dt>Summary</dt>
          <dd>{entry.summary || <span className="admin-audit-detail-muted">—</span>}</dd>
          <dt>Recorded at</dt>
          <dd>
            {whenFormatted} <span className="admin-audit-detail-muted">({entry.created_at})</span>
          </dd>
        </dl>
      </section>

      <div className="admin-audit-detail-footer">
        <Link href="/admin/audit-log" className="admin-btn admin-btn-ghost">
          ← Back to audit log
        </Link>
      </div>
    </div>
  );
}
