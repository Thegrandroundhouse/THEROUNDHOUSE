"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { adminFetch, parseAdminError } from "@/lib/admin-api-client";
import { useAdminDialog } from "@/components/admin/AdminDialogContext";
import { SetReminderModal } from "@/components/admin/SetReminderModal";
import { ClientAddressFields } from "@/components/admin/ClientAddressFields";

const STATUS_OPTIONS = ["draft", "sent", "paid", "cancelled"] as const;

type LineItem = { description: string; detail?: string; quantity: number; unit_cents: number; line_total_cents: number };

type Invoice = {
  id: string;
  invoice_number: string;
  booking_id: string | null;
  amount_cents: number;
  subtotal_cents: number | null;
  tax_cents: number | null;
  due_date: string | null;
  status: string;
  client_name: string | null;
  client_email: string | null;
  client_address: string | null;
  notes: string | null;
  admin_notes: string | null;
  issued_date: string | null;
  line_items: LineItem[] | null;
  created_at: string;
  updated_at: string;
  booking?: { id: string; booking_code: string | null; client_name: string | null; client_email: string; event_date: string } | null;
};

function gbp(c: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(c / 100);
}

export default function InvoiceDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { alert, confirm } = useAdminDialog();
  const [inv, setInv] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [status, setStatus] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [clientAddress, setClientAddress] = useState("");

  const load = useCallback(() => {
    adminFetch(`/api/admin/invoices/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setInv(data);
          setStatus(data.status || "draft");
          setDueDate(data.due_date || "");
          setNotes(data.notes || "");
          setAdminNotes(data.admin_notes || "");
          setClientAddress(data.client_address || "");
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await adminFetch(`/api/admin/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          due_date: dueDate || null,
          notes: notes || null,
          admin_notes: adminNotes || null,
          client_address: clientAddress || null,
        }),
      });
      if (!res.ok) {
        await alert(await parseAdminError(res, "Couldn’t save invoice"));
        return;
      }
      const data = await res.json();
      setInv(data);
      setClientAddress(data.client_address || "");
      await alert("Saved.");
    } finally {
      setSaving(false);
    }
  };

  const downloadPdf = async () => {
    const r = await adminFetch(`/api/admin/invoices/${id}/pdf`);
    if (!r.ok) {
      await alert(await parseAdminError(r, "Couldn’t download PDF"));
      return;
    }
    const blob = await r.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `invoice-${inv?.invoice_number || id}.pdf`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleDelete = async () => {
    const ok = await confirm("Delete this invoice? This cannot be undone.");
    if (!ok) return;
    const res = await adminFetch(`/api/admin/invoices/${id}`, { method: "DELETE" });
    if (!res.ok) {
      await alert(await parseAdminError(res, "Couldn’t delete invoice"));
      return;
    }
    router.push("/admin/invoices");
  };

  if (loading && !inv) {
    return (
      <div className="admin-inv">
        <p className="admin-lead">Loading invoice…</p>
        <Link href="/admin/invoices" className="admin-bkd-back">← Invoices</Link>
      </div>
    );
  }

  if (!inv) {
    return (
      <div className="admin-inv">
        <p className="admin-lead">Invoice not found.</p>
        <Link href="/admin/invoices" className="admin-bkd-back">← Invoices</Link>
      </div>
    );
  }

  const lines = Array.isArray(inv.line_items) ? inv.line_items : [];

  return (
    <div className="admin-inv">
      <div className="admin-page-banner">
        <header className="admin-bk-hero">
          <div className="admin-bk-hero-text">
            <Link href="/admin/invoices" className="admin-bkd-back">
              ← Invoices
            </Link>
            <p className="admin-dash-kicker">Finance</p>
            <h1 className="admin-page-title admin-bk-title">
              <span className="admin-inv-num">{inv.invoice_number}</span>
            </h1>
            <p className="admin-lead admin-bk-lead">
              Issued {inv.issued_date || inv.created_at.slice(0, 10)}
              {inv.booking_id && inv.booking && (
                <> · <Link href={`/admin/bookings/${inv.booking_id}`} className="admin-inv-link">{inv.booking.booking_code || "Booking"} {inv.booking.event_date}</Link></>
              )}
            </p>
          </div>
          <div className="admin-bk-hero-actions admin-inv-detail-hero-actions">
            <div className="admin-inv-detail-hero-tools">
              <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setReminderOpen(true)}>
                Set reminder
              </button>
              <button type="button" className="admin-btn admin-btn-ghost" onClick={downloadPdf}>
                Download PDF
              </button>
            </div>
            <button type="button" className="admin-btn admin-btn-primary admin-inv-detail-hero-save" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </header>
      </div>

      <SetReminderModal
        open={reminderOpen}
        onClose={() => setReminderOpen(false)}
        invoiceId={id}
        onCreated={() => setReminderOpen(false)}
      />

      <div className="admin-unified-layout">
        <section className="admin-card">
          <h2 className="admin-section-title">Details</h2>
          <div className="admin-form-grid">
            <div className="admin-form-group">
              <label>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="admin-table-select">
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="admin-form-group">
              <label>Due date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="admin-form-group admin-form-full">
              <label>Client</label>
              <p style={{ margin: "0 0 0.75rem", color: "var(--color-text)" }}>
                <strong>{inv.client_name || "—"}</strong><br />
                <span style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>{inv.client_email || "—"}</span>
              </p>
              <ClientAddressFields value={clientAddress} onChange={setClientAddress} />
            </div>
            {inv.booking_id && (
              <div className="admin-form-group admin-form-full">
                <label>Linked booking</label>
                <Link href={`/admin/bookings/${inv.booking_id}`} className="admin-btn admin-btn-sm admin-btn-primary">
                  View booking →
                </Link>
              </div>
            )}
          </div>
        </section>

        <section className="admin-card">
          <h2 className="admin-section-title">Line items</h2>
          <div className="admin-pay-table-wrap">
            <table className="admin-pay-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Detail</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="admin-pay-empty">No line items</td>
                  </tr>
                ) : (
                  lines.map((line, i) => (
                    <tr key={i}>
                      <td>{line.description}</td>
                      <td>{line.detail || "—"}</td>
                      <td>{line.quantity}</td>
                      <td>{gbp(line.unit_cents)}</td>
                      <td className="admin-pay-amt">{gbp(line.line_total_cents)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p style={{ marginTop: "0.75rem", fontSize: "0.875rem" }}>
            Subtotal <strong>{gbp(inv.subtotal_cents ?? inv.amount_cents)}</strong>
            {(inv.tax_cents ?? 0) > 0 && <> + Tax {gbp(inv.tax_cents!)}</>}
            {" → "}<strong>{gbp(inv.amount_cents)}</strong>
          </p>
        </section>

        <section className="admin-card">
          <h2 className="admin-section-title">Notes (on PDF)</h2>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Payment terms, bank details — appears on PDF"
            style={{ width: "100%", padding: "0.5rem 0.75rem", border: "1px solid var(--color-border)", borderRadius: "var(--radius)" }}
          />
        </section>

        <section className="admin-card">
          <h2 className="admin-section-title">Internal comments</h2>
          <p className="admin-vnd-new-hint">Not shown on PDF. Use for follow-ups, reminders, or internal notes.</p>
          <textarea
            rows={3}
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Add a comment or note…"
            style={{ width: "100%", padding: "0.5rem 0.75rem", border: "1px solid var(--color-border)", borderRadius: "var(--radius)" }}
          />
        </section>

        <section className="admin-inv-detail-actions" aria-label="Save and export">
          <div className="admin-inv-detail-actions-inner">
            <div className="admin-inv-detail-actions-primary">
              <button type="button" className="admin-btn admin-btn-primary" onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </button>
              <p className="admin-inv-detail-actions-hint">Updates status, due date, PDF notes &amp; internal comments.</p>
            </div>
            <div className="admin-inv-detail-actions-secondary">
              <button type="button" className="admin-btn admin-btn-ghost" onClick={downloadPdf}>
                Download PDF
              </button>
              <button type="button" className="admin-btn admin-btn-ghost admin-inv-detail-actions-delete" onClick={handleDelete}>
                Delete
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
