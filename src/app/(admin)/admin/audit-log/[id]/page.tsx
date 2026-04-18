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
      <div className="admin-bk">
        <h1 className="admin-page-title">Audit log</h1>
        <p className="admin-lead">Only administrators can view audit log entries.</p>
        <Link href="/admin/audit-log" className="admin-btn admin-btn-primary">
          Back to audit log
        </Link>
      </div>
    );
  }

  if (notFound || (!loading && !entry)) {
    return (
      <div className="admin-bk">
        <h1 className="admin-page-title">Audit log entry</h1>
        <p className="admin-lead">Entry not found. It may have been deleted or the ID is invalid.</p>
        <Link href="/admin/audit-log" className="admin-btn admin-btn-primary">
          Back to audit log
        </Link>
      </div>
    );
  }

  if (loading || !entry) {
    return (
      <div className="admin-bk">
        <div className="admin-bk-skeleton-line admin-bk-skeleton-line--lg" aria-busy />
      </div>
    );
  }

  const hasPayload = entry.payload_before != null || entry.payload_after != null;
  const hasMetadata = entry.metadata != null && Object.keys(entry.metadata).length > 0;
  const whenFormatted = new Date(entry.created_at).toLocaleString("en-GB", { dateStyle: "long", timeStyle: "medium" });

  return (
    <div className="admin-bkd admin-audit-detail-page">
      <div className="admin-bkd-top-actions">
        <Link href="/admin/audit-log" className="admin-bkd-back">
          ← Back to audit log
        </Link>
      </div>

      <header className="admin-audit-detail-hero">
        <h1 className="admin-page-title admin-audit-detail-title">Entry details</h1>
        <p className="admin-audit-detail-oneline">
          <strong>{entry.actor_display_name}</strong> {entry.action.replace(/_/g, " ")} {entry.entity_type}
          {entry.booking_code ? <> · {entry.booking_code}</> : null}
          {" · "}
          {whenFormatted}
        </p>
        <p className="admin-audit-detail-id">
          Record ID: <code className="admin-bk-code">{entry.id}</code>
        </p>
      </header>

      <div className="admin-audit-detail-glance">
        <span><strong>Who:</strong> {entry.actor_display_name}{entry.actor_email ? ` (${entry.actor_email})` : ""}</span>
        <span><strong>When:</strong> {whenFormatted}</span>
        <span><strong>Action:</strong> {entry.action.replace(/_/g, " ")}</span>
        <span><strong>Type:</strong> {entry.entity_type}</span>
      </div>

      <section className="admin-audit-detail-section">
        <h2 className="admin-audit-detail-heading">What happened</h2>
        <p className="admin-audit-detail-summary">{entry.summary}</p>
        <dl className="admin-audit-detail-dl">
          <dt>Action</dt>
          <dd><span className="admin-audit-detail-pill">{entry.action.replace(/_/g, " ")}</span></dd>
          <dt>Item type</dt>
          <dd>{entry.entity_type}</dd>
          {entry.entity_id ? (
            <>
              <dt>Item ID</dt>
              <dd>
                <code className="admin-bk-code">{entry.entity_id}</code>
                {entry.entity_type === "enquiry" ? (
                  <> · <Link href={`/admin/enquiries/${entry.entity_id}`}>View enquiry</Link></>
                ) : null}
              </dd>
            </>
          ) : null}
          {entry.booking_id ? (
            <>
              <dt>Booking</dt>
              <dd>
                {entry.booking_code ? <code className="admin-bk-code">{entry.booking_code}</code> : null}
                {" "}
                <Link href={`/admin/bookings/${entry.booking_id}`}>View booking</Link>
                {" · "}
                <Link href={`/admin/payments/booking/${entry.booking_id}`}>Payments</Link>
              </dd>
            </>
          ) : null}
        </dl>
      </section>

      {hasPayload ? (
        <section className="admin-audit-detail-section">
          <h2 className="admin-audit-detail-heading">What changed (before & after)</h2>
          <p className="admin-audit-detail-muted" style={{ marginBottom: "0.75rem" }}>Raw data: the state before and after the action. Useful for support or debugging.</p>
          {entry.payload_before != null ? (
            <div className="admin-audit-detail-json-block">
              <h3 className="admin-audit-detail-sub">Before</h3>
              <pre className="admin-audit-detail-pre">{JSON.stringify(entry.payload_before, null, 2)}</pre>
            </div>
          ) : null}
          {entry.payload_after != null ? (
            <div className="admin-audit-detail-json-block">
              <h3 className="admin-audit-detail-sub">After</h3>
              <pre className="admin-audit-detail-pre">{JSON.stringify(entry.payload_after, null, 2)}</pre>
            </div>
          ) : null}
        </section>
      ) : (
        <section className="admin-audit-detail-section">
          <h2 className="admin-audit-detail-heading">What changed (before & after)</h2>
          <p className="admin-audit-detail-muted" style={{ margin: 0 }}>No before/after data was recorded for this entry.</p>
        </section>
      )}

      {hasMetadata ? (
        <section className="admin-audit-detail-section">
          <h2 className="admin-audit-detail-heading">Extra data</h2>
          <p className="admin-audit-detail-muted" style={{ marginBottom: "0.75rem" }}>Additional technical details (e.g. export options, file names).</p>
          <pre className="admin-audit-detail-pre">{JSON.stringify(entry.metadata, null, 2)}</pre>
        </section>
      ) : (
        <section className="admin-audit-detail-section">
          <h2 className="admin-audit-detail-heading">Extra data</h2>
          <p className="admin-audit-detail-muted" style={{ margin: 0 }}>No extra data recorded.</p>
        </section>
      )}

      <section className="admin-audit-detail-section admin-audit-detail-technical">
        <h2 className="admin-audit-detail-heading">All fields</h2>
        <p className="admin-audit-detail-muted" style={{ marginBottom: "0.75rem" }}>Every field for this entry — for support or copying IDs.</p>
        <dl className="admin-audit-detail-dl">
          <dt>Record ID</dt>
          <dd><code className="admin-bk-code">{entry.id}</code></dd>
          <dt>Who (user ID)</dt>
          <dd>{entry.actor_user_id ? <code className="admin-bk-code">{entry.actor_user_id}</code> : <span className="admin-audit-detail-muted">—</span>}</dd>
          <dt>Email</dt>
          <dd>{entry.actor_email ?? <span className="admin-audit-detail-muted">—</span>}</dd>
          <dt>Display name</dt>
          <dd>{entry.actor_display_name || <span className="admin-audit-detail-muted">—</span>}</dd>
          <dt>Action</dt>
          <dd>{entry.action.replace(/_/g, " ")}</dd>
          <dt>Item type</dt>
          <dd>{entry.entity_type}</dd>
          <dt>Item ID</dt>
          <dd>{entry.entity_id ? <code className="admin-bk-code">{entry.entity_id}</code> : <span className="admin-audit-detail-muted">—</span>}</dd>
          <dt>Booking ID</dt>
          <dd>{entry.booking_id ? <code className="admin-bk-code">{entry.booking_id}</code> : <span className="admin-audit-detail-muted">—</span>}</dd>
          <dt>Summary</dt>
          <dd>{entry.summary || <span className="admin-audit-detail-muted">—</span>}</dd>
          <dt>Recorded at</dt>
          <dd>{whenFormatted} <span className="admin-audit-detail-muted">({entry.created_at})</span></dd>
          <dt>Data before</dt>
          <dd>{entry.payload_before != null ? "Yes (see above)" : <span className="admin-audit-detail-muted">—</span>}</dd>
          <dt>Data after</dt>
          <dd>{entry.payload_after != null ? "Yes (see above)" : <span className="admin-audit-detail-muted">—</span>}</dd>
          <dt>Extra data</dt>
          <dd>{hasMetadata ? "Yes (see above)" : <span className="admin-audit-detail-muted">—</span>}</dd>
        </dl>
      </section>

      <div className="admin-audit-detail-footer">
        <Link href="/admin/audit-log" className="admin-btn admin-btn-ghost">
          Back to audit log
        </Link>
      </div>
    </div>
  );
}
