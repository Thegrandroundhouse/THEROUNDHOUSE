"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { adminFetch } from "@/lib/admin-api-client";
import { useAdminDialog } from "@/components/admin/AdminDialogContext";

function gbp(c: number | null) {
  if (c == null) return "—";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(c / 100);
}

function centsToInput(c: number | null) {
  if (c == null) return "";
  return (c / 100).toFixed(2);
}

const FLOW_LABEL: Record<string, string> = {
  customer_in: "Client → venue",
  vendor_out: "Venue → supplier",
  vendor_in: "Supplier credit",
  adjustment: "Adjustment",
};

type PaymentBookingPayload = {
  booking: Record<string, unknown>;
  milestones: { id: string; label: string; amount_cents: number | null; due_date: string | null; status: string }[];
  records: { id: string; flow: string; amount_cents: number; label: string; paid_at: string; vendor_id: string | null; vendors?: { name: string } | null }[];
  totals: Record<string, number>;
};

const MILESTONE_STATUS_OPTS: { value: string; label: string }[] = [
  { value: "pending", label: "Not paid" },
  { value: "partial", label: "Partial" },
  { value: "paid", label: "Paid" },
  { value: "refunded", label: "Refunded" },
  { value: "waived", label: "Waived" },
];

export default function PaymentBookingDetailPage() {
  const { bookingId } = useParams() as { bookingId: string };
  const { alert, confirm } = useAdminDialog();
  const [data, setData] = useState<PaymentBookingPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({ flow: "customer_in", amount_pounds: "", label: "", vendor_id: "", notes: "" });
  const [milestoneDraft, setMilestoneDraft] = useState<Record<string, string>>({});
  const [milestoneAmt, setMilestoneAmt] = useState<Record<string, string>>({});
  const [milestoneDue, setMilestoneDue] = useState<Record<string, string>>({});
  const [milestoneUpdating, setMilestoneUpdating] = useState<string | null>(null);
  const [ledgerEditId, setLedgerEditId] = useState<string | null>(null);
  const [ledgerDraft, setLedgerDraft] = useState({ amount_pounds: "", label: "", paid_at: "" });
  const [ledgerBusy, setLedgerBusy] = useState<string | null>(null);
  const [ledgerMenuOpenId, setLedgerMenuOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (ledgerEditId) setLedgerMenuOpenId(null);
  }, [ledgerEditId]);

  useEffect(() => {
    if (!ledgerMenuOpenId) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      const wrap = t.closest("[data-ledger-menu-wrap]");
      if (wrap?.getAttribute("data-ledger-row") === ledgerMenuOpenId) return;
      setLedgerMenuOpenId(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLedgerMenuOpenId(null);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [ledgerMenuOpenId]);

  function isoToDatetimeLocal(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    Promise.all([
      adminFetch(`/api/admin/payments/booking/${bookingId}`).then(async (r) => {
        if (!r.ok) {
          const t = await r.text();
          try {
            const j = JSON.parse(t) as { error?: string };
            throw new Error(j.error || t || r.statusText);
          } catch (e) {
            if (e instanceof Error && e.message !== t) throw e;
            throw new Error(t || `HTTP ${r.status}`);
          }
        }
        return r.json() as Promise<PaymentBookingPayload>;
      }),
      adminFetch("/api/admin/vendors?page=1&limit=100")
        .then((r) => (r.ok ? r.json() : { rows: [] }))
        .then((d: { rows?: { id: string; name: string }[] }) => d.rows ?? [])
        .catch(() => [] as { id: string; name: string }[]),
    ])
      .then(([payload, vend]) => {
        setData(payload);
        setVendors(Array.isArray(vend) ? vend : []);
        const st: Record<string, string> = {};
        const am: Record<string, string> = {};
        const du: Record<string, string> = {};
        for (const m of payload.milestones || []) {
          st[m.id] = m.status;
          am[m.id] = centsToInput(m.amount_cents);
          du[m.id] = m.due_date || "";
        }
        setMilestoneDraft(st);
        setMilestoneAmt(am);
        setMilestoneDue(du);
      })
      .catch((e) => {
        setData(null);
        setLoadError(e instanceof Error ? e.message : "Could not load payments.");
      })
      .finally(() => setLoading(false));
  }, [bookingId]);

  useEffect(() => {
    load();
  }, [load]);

  const milestoneDirty = useCallback(
    (m: PaymentBookingPayload["milestones"][0]) => {
      const curS = milestoneDraft[m.id] ?? m.status;
      const curA = milestoneAmt[m.id]?.trim() || "";
      const curD = milestoneDue[m.id]?.trim() || "";
      const origA = centsToInput(m.amount_cents);
      const origD = m.due_date || "";
      const amtCents = curA ? Math.round(parseFloat(curA.replace(/[^0-9.]/g, "")) * 100) : null;
      const origCents = m.amount_cents;
      return curS !== m.status || amtCents !== origCents || curD !== origD;
    },
    [milestoneDraft, milestoneAmt, milestoneDue],
  );

  const saveMilestone = async (m: PaymentBookingPayload["milestones"][0]) => {
    const curS = milestoneDraft[m.id] ?? m.status;
    const curA = milestoneAmt[m.id]?.trim() || "";
    const amt_cents = curA ? Math.round(parseFloat(curA.replace(/[^0-9.]/g, "")) * 100) : null;
    if (curA && (Number.isNaN(amt_cents!) || amt_cents! < 0)) {
      await alert("Enter a valid amount or leave blank.");
      return;
    }
    const due = milestoneDue[m.id]?.trim() || null;
    setMilestoneUpdating(m.id);
    try {
      const r = await adminFetch(`/api/admin/payment-milestones/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: curS,
          amount_cents: amt_cents,
          due_date: due,
        }),
      });
      if (!r.ok) await alert(await r.text());
      else load();
    } finally {
      setMilestoneUpdating(null);
    }
  };

  const saveLedgerRow = async (rid: string) => {
    const cents = Math.round(parseFloat(ledgerDraft.amount_pounds.replace(/[^0-9.]/g, "")) * 100);
    if (!Number.isFinite(cents) || cents < 0) {
      await alert("Enter a valid amount.");
      return;
    }
    const paid = new Date(ledgerDraft.paid_at);
    if (Number.isNaN(paid.getTime())) {
      await alert("Invalid date/time.");
      return;
    }
    setLedgerBusy(rid);
    try {
      const r = await adminFetch(`/api/admin/payment-records/${rid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount_cents: cents,
          label: ledgerDraft.label.trim() || "Payment",
          paid_at: paid.toISOString(),
        }),
      });
      if (!r.ok) await alert(await r.text());
      else {
        setLedgerEditId(null);
        load();
      }
    } finally {
      setLedgerBusy(null);
    }
  };

  const deleteLedgerRow = async (rid: string) => {
    if (!(await confirm("Delete this ledger entry?", { title: "Delete entry", variant: "danger", confirmLabel: "Delete" }))) return;
    setLedgerBusy(rid);
    try {
      const r = await adminFetch(`/api/admin/payment-records/${rid}`, { method: "DELETE" });
      if (!r.ok) await alert(await r.text());
      else load();
    } finally {
      setLedgerBusy(null);
    }
  };

  const addRecord = async () => {
    const amount_cents = Math.round((parseFloat(form.amount_pounds) || 0) * 100);
    if (!amount_cents) {
      await alert("Enter an amount");
      return;
    }
    const res = await adminFetch("/api/admin/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        booking_id: bookingId,
        flow: form.flow,
        amount_cents,
        label: form.label || "Payment",
        vendor_id: form.flow.startsWith("vendor") ? form.vendor_id || null : null,
        notes: form.notes || null,
      }),
    });
    if (!res.ok) await alert(await res.text());
    else {
      setForm({ flow: "customer_in", amount_pounds: "", label: "", vendor_id: "", notes: "" });
      load();
    }
  };

  const b = data?.booking as
    | {
        client_name: string | null;
        client_email: string;
        event_date: string;
        total_cents: number | null;
        booking_code?: string | null;
      }
    | undefined;

  const pct = useMemo(() => {
    if (!data || !b) return 0;
    const recv = data.totals.customer_received ?? 0;
    const total = b.total_cents ?? 0;
    return total > 0 ? Math.min(100, Math.round((recv / total) * 100)) : 0;
  }, [data, b]);

  if (loading) {
    return (
      <div className="admin-pay-bk admin-crm-wide">
        <div className="admin-pay-bk-skel">
          <div className="admin-pay-bk-skel-hero" />
          <div className="admin-pay-bk-skel-stats" />
        </div>
        <p className="admin-pay-bk-skel-text">Loading…</p>
      </div>
    );
  }

  if (loadError || !data?.booking || !b) {
    return (
      <div className="admin-pay-bk admin-crm-wide">
        <div className="admin-page-banner">
          <header className="admin-bk-hero">
            <div className="admin-bk-hero-text">
              <p className="admin-dash-kicker">Finance</p>
              <h1 className="admin-page-title admin-bk-title">Payments</h1>
              <p className="admin-lead admin-bk-lead">{loadError || "Booking not found or payments data unavailable."}</p>
              <p className="admin-vnd-new-hint" style={{ marginTop: "0.5rem" }}>
                If you see a database error, run migration <code>017_vendors_payments_seasons.sql</code>.
              </p>
            </div>
            <div className="admin-bk-hero-actions">
              <Link href="/admin/payments" className="admin-btn admin-btn-primary">
                ← Ledger
              </Link>
              <Link href="/admin/bookings" className="admin-btn admin-btn-ghost">
                Bookings
              </Link>
            </div>
          </header>
        </div>
      </div>
    );
  }

  const recv = data.totals.customer_received ?? 0;
  const total = b.total_cents ?? 0;

  return (
    <div className="admin-pay-bk admin-crm-wide">
      <div className="admin-page-banner">
        <header className="admin-bk-hero">
          <div className="admin-bk-hero-text">
            <p className="admin-dash-kicker">Finance</p>
            {b.booking_code ? (
              <p className="admin-pay-bk-code-banner">
                <code className="admin-bk-code">{b.booking_code}</code>
              </p>
            ) : null}
            <h1 className="admin-page-title admin-bk-title">{b.client_name || b.client_email}</h1>
            <p className="admin-lead admin-bk-lead">
              <span className="admin-pay-bk-meta-date">{b.event_date}</span>
              <span className="admin-pay-bk-meta-dot"> · </span>
              Payment workspace — milestones, ledger, and recorded movements.
            </p>
          </div>
          <div className="admin-bk-hero-actions">
            <Link href="/admin/payments" className="admin-btn admin-btn-ghost">
              ← Ledger
            </Link>
            <Link href={`/admin/bookings/${bookingId}`} className="admin-btn admin-btn-primary">
              View booking
            </Link>
          </div>
        </header>
      </div>

      <div className="admin-stats-unified-wrap">
      <div className="admin-pay-bk-stats">
        <div className="admin-pay-bk-stat admin-pay-bk-stat--in">
          <span className="admin-pay-bk-stat-label">Client received</span>
          <span className="admin-pay-bk-stat-val">{gbp(data.totals.customer_received)}</span>
          <span className="admin-pay-bk-stat-hint">Money in from client</span>
        </div>
        <div className="admin-pay-bk-stat admin-pay-bk-stat--out">
          <span className="admin-pay-bk-stat-label">Paid to suppliers</span>
          <span className="admin-pay-bk-stat-val">{gbp(data.totals.vendor_paid_out)}</span>
          <span className="admin-pay-bk-stat-hint">Venue → supplier</span>
        </div>
        <div className="admin-pay-bk-stat">
          <span className="admin-pay-bk-stat-label">Booking total</span>
          <span className="admin-pay-bk-stat-val">{gbp(b.total_cents)}</span>
          <span className="admin-pay-bk-stat-hint">Agreed price</span>
        </div>
        <div className="admin-pay-bk-stat admin-pay-bk-stat--pending">
          <span className="admin-pay-bk-stat-label">Outstanding schedule</span>
          <span className="admin-pay-bk-stat-val">{gbp(data.totals.milestone_pending)}</span>
          <span className="admin-pay-bk-stat-hint">Pending + partial</span>
        </div>
      </div>

      {total > 0 ? (
        <div className="admin-pay-bk-progress-wrap">
          <div className="admin-pay-bk-progress-label">
            <span>Collected vs total</span>
            <span>{pct}%</span>
          </div>
          <div className="admin-pay-bk-progress-bar">
            <div className="admin-pay-bk-progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      ) : null}
      </div>

      <div className="admin-pay-bk-grid">
        <section className="admin-pay-bk-card admin-pay-bk-card--schedule">
          <h2 className="admin-pay-bk-h2">Payment schedule</h2>
          <p className="admin-pay-bk-card-desc">
            Edit <strong>£ amount</strong>, <strong>due date</strong>, and <strong>status</strong> — then <strong>Save</strong>.
          </p>
          {data.milestones.length === 0 ? (
            <p className="admin-pay-bk-empty">No milestones — add them in the booking workspace.</p>
          ) : (
            <div className="admin-pay-bk-mile-table-wrap">
              <table className="admin-pay-bk-mile-table">
                <thead>
                  <tr>
                    <th>Milestone</th>
                    <th>Amount (£)</th>
                    <th>Due</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.milestones.map((m) => {
                    const dirty = milestoneDirty(m);
                    return (
                      <tr key={m.id}>
                        <td>
                          <strong>{m.label}</strong>
                        </td>
                        <td>
                          <input
                            type="text"
                            inputMode="decimal"
                            className="admin-pay-bk-input admin-pay-bk-input--compact"
                            placeholder="0.00"
                            value={milestoneAmt[m.id] ?? ""}
                            onChange={(e) => setMilestoneAmt((x) => ({ ...x, [m.id]: e.target.value }))}
                            aria-label={`Amount for ${m.label}`}
                          />
                        </td>
                        <td>
                          <input
                            type="date"
                            className="admin-pay-bk-input admin-pay-bk-input--compact"
                            value={milestoneDue[m.id] ?? ""}
                            onChange={(e) => setMilestoneDue((x) => ({ ...x, [m.id]: e.target.value }))}
                            aria-label={`Due date for ${m.label}`}
                          />
                        </td>
                        <td>
                          <select
                            className="admin-pay-bk-input"
                            value={milestoneDraft[m.id] ?? m.status}
                            onChange={(e) => setMilestoneDraft((d) => ({ ...d, [m.id]: e.target.value }))}
                            aria-label={`Status for ${m.label}`}
                          >
                            {MILESTONE_STATUS_OPTS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="admin-btn admin-btn-primary admin-btn-sm"
                            disabled={!dirty || milestoneUpdating === m.id}
                            onClick={() => saveMilestone(m)}
                          >
                            {milestoneUpdating === m.id ? "…" : "Save"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="admin-pay-bk-card">
          <h2 className="admin-pay-bk-h2">Ledger</h2>
          <p className="admin-pay-bk-card-desc">Recorded movements for this booking</p>
          <div className="admin-pay-bk-table-wrap">
            <table className="admin-pay-bk-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Flow</th>
                  <th>Amount</th>
                  <th>Label</th>
                  <th className="admin-pay-bk-th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.records.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="admin-pay-bk-empty-cell">
                      No entries yet — use the form below.
                    </td>
                  </tr>
                ) : (
                  data.records.map((r) => {
                    const editing = ledgerEditId === r.id;
                    return (
                      <tr key={r.id}>
                        <td className="admin-pay-bk-td-date">
                          {editing ? (
                            <input
                              type="datetime-local"
                              className="admin-pay-bk-input admin-pay-bk-input--compact"
                              value={ledgerDraft.paid_at}
                              onChange={(e) => setLedgerDraft((d) => ({ ...d, paid_at: e.target.value }))}
                            />
                          ) : (
                            new Date(r.paid_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })
                          )}
                        </td>
                        <td>
                          <span className={`admin-pay-bk-flow admin-pay-bk-flow--${r.flow}`}>{FLOW_LABEL[r.flow] || r.flow}</span>
                        </td>
                        <td className="admin-pay-bk-td-amt">
                          {editing ? (
                            <input
                              type="text"
                              inputMode="decimal"
                              className="admin-pay-bk-input admin-pay-bk-input--compact"
                              value={ledgerDraft.amount_pounds}
                              onChange={(e) => setLedgerDraft((d) => ({ ...d, amount_pounds: e.target.value }))}
                            />
                          ) : (
                            gbp(r.amount_cents)
                          )}
                        </td>
                        <td>
                          {editing ? (
                            <input
                              type="text"
                              className="admin-pay-bk-input admin-pay-bk-input--compact"
                              value={ledgerDraft.label}
                              onChange={(e) => setLedgerDraft((d) => ({ ...d, label: e.target.value }))}
                            />
                          ) : (
                            <>
                              {r.label}
                              {r.vendors?.name ? <span className="admin-pay-bk-td-muted"> · {r.vendors.name}</span> : null}
                            </>
                          )}
                        </td>
                        <td>
                          <div className="admin-pay-bk-ledger-actions">
                            {editing ? (
                              <>
                                <button
                                  type="button"
                                  className="admin-btn admin-btn-primary admin-btn-sm"
                                  disabled={ledgerBusy === r.id}
                                  onClick={() => saveLedgerRow(r.id)}
                                >
                                  {ledgerBusy === r.id ? "…" : "Save"}
                                </button>
                                <button
                                  type="button"
                                  className="admin-btn admin-btn-ghost admin-btn-sm"
                                  disabled={ledgerBusy === r.id}
                                  onClick={() => setLedgerEditId(null)}
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <div
                                className="admin-pay-bk-ledger-menu-wrap"
                                data-ledger-menu-wrap=""
                                data-ledger-row={r.id}
                              >
                                <button
                                  type="button"
                                  className="admin-pay-bk-ledger-more"
                                  disabled={ledgerBusy !== null}
                                  aria-expanded={ledgerMenuOpenId === r.id}
                                  aria-haspopup="menu"
                                  aria-label={`Actions for ${r.label || "ledger entry"}`}
                                  onClick={() =>
                                    setLedgerMenuOpenId((id) => (id === r.id ? null : r.id))
                                  }
                                >
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                                    <circle cx="12" cy="5" r="2" />
                                    <circle cx="12" cy="12" r="2" />
                                    <circle cx="12" cy="19" r="2" />
                                  </svg>
                                </button>
                                {ledgerMenuOpenId === r.id ? (
                                  <div className="admin-pay-bk-ledger-dropdown" role="menu">
                                    <button
                                      type="button"
                                      role="menuitem"
                                      className="admin-pay-bk-ledger-dropdown-item"
                                      disabled={ledgerBusy !== null}
                                      onClick={() => {
                                        setLedgerMenuOpenId(null);
                                        setLedgerEditId(r.id);
                                        setLedgerDraft({
                                          amount_pounds: (r.amount_cents / 100).toFixed(2),
                                          label: r.label,
                                          paid_at: isoToDatetimeLocal(r.paid_at),
                                        });
                                      }}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      role="menuitem"
                                      className="admin-pay-bk-ledger-dropdown-item admin-pay-bk-ledger-dropdown-item--danger"
                                      disabled={ledgerBusy !== null}
                                      onClick={() => {
                                        setLedgerMenuOpenId(null);
                                        void deleteLedgerRow(r.id);
                                      }}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="admin-pay-bk-form-card">
        <h2 className="admin-pay-bk-h2">Add ledger entry</h2>
        <p className="admin-pay-bk-card-desc">Log a payment or adjustment — it will appear on the main ledger too.</p>
        <div className="admin-pay-bk-form-grid">
          <div className="admin-form-group">
            <label>Flow</label>
            <select className="admin-pay-bk-input" value={form.flow} onChange={(e) => setForm((f) => ({ ...f, flow: e.target.value }))}>
              <option value="customer_in">Client paid venue</option>
              <option value="vendor_out">Venue paid supplier</option>
              <option value="vendor_in">Supplier refund / credit</option>
              <option value="adjustment">Adjustment</option>
            </select>
          </div>
          {(form.flow === "vendor_out" || form.flow === "vendor_in") && (
            <div className="admin-form-group">
              <label>Supplier</label>
              <select className="admin-pay-bk-input" value={form.vendor_id} onChange={(e) => setForm((f) => ({ ...f, vendor_id: e.target.value }))}>
                <option value="">Select…</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="admin-form-group">
            <label>Amount (£)</label>
            <input className="admin-pay-bk-input" inputMode="decimal" value={form.amount_pounds} onChange={(e) => setForm((f) => ({ ...f, amount_pounds: e.target.value }))} placeholder="0.00" />
          </div>
          <div className="admin-form-group">
            <label>Label</label>
            <input className="admin-pay-bk-input" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="Deposit, balance…" />
          </div>
          <div className="admin-form-group admin-form-full">
            <label>Notes (optional)</label>
            <textarea className="admin-pay-bk-input admin-pay-bk-textarea" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
        <button type="button" className="admin-btn admin-btn-primary admin-pay-bk-submit" onClick={addRecord}>
          Add entry
        </button>
      </section>
    </div>
  );
}
