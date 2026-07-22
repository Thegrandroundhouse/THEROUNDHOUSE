"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/lib/admin-api-client";
import { useAdminDialog } from "@/components/admin/AdminDialogContext";
import { ClientAddressFields } from "@/components/admin/ClientAddressFields";
import { normalizeStoredUkAddress } from "@/lib/uk-address";

type LineRow = { description: string; detail: string; qty: string; pounds: string };
type BookingOpt = {
  id: string;
  client_name: string | null;
  client_email: string;
  client_address?: string | null;
  event_date: string;
  total_cents: number | null;
  package_name: string | null;
  booking_code?: string | null;
};
type PackageOpt = {
  id: string;
  name: string;
  line_items: { label: string; description: string; amount_cents: number }[] | null;
};

const STATUS = ["draft", "sent", "paid", "cancelled"] as const;

function gbp(c: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(c / 100);
}

export default function NewInvoicePage() {
  const { alert } = useAdminDialog();
  const router = useRouter();
  const [bookings, setBookings] = useState<BookingOpt[]>([]);
  const [packages, setPackages] = useState<PackageOpt[]>([]);
  const [preferredLogoUrl, setPreferredLogoUrl] = useState<string | null>(null);
  const [logoMode, setLogoMode] = useState<"preferred" | "custom">("preferred");
  const [customLogoUrl, setCustomLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [setAsPreferred, setSetAsPreferred] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    booking_id: "",
    package_id: "",
    client_name: "",
    client_email: "",
    client_address: "",
    due_date: "",
    tax_pounds: "0",
    notes: "",
    status: "draft" as (typeof STATUS)[number],
  });
  const [lines, setLines] = useState<LineRow[]>([{ description: "", detail: "", qty: "1", pounds: "" }]);

  useEffect(() => {
    adminFetch("/api/admin/bookings?limit=200")
      .then((r) => r.json())
      .then((d) => setBookings(d.rows || d || []));
    adminFetch("/api/admin/packages")
      .then((r) => r.json())
      .then((d) => {
        const arr = Array.isArray(d) ? d : d?.rows ?? [];
        setPackages(arr);
      });
    adminFetch("/api/admin/settings/invoice-logo")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setPreferredLogoUrl(d?.url ?? null));
  }, []);

  const fillFromBooking = (bookingId: string) => {
    const b = bookings.find((x) => x.id === bookingId);
    if (!b) return;
    setForm((f) => ({
      ...f,
      booking_id: bookingId,
      client_name: b.client_name || "",
      client_email: b.client_email,
      client_address: normalizeStoredUkAddress(b.client_address) || "",
    }));
    if (b.total_cents) {
      setLines([{ description: b.package_name || "Venue & services", detail: `Event ${b.event_date}`, qty: "1", pounds: (b.total_cents / 100).toFixed(2) }]);
    }
  };

  const fillFromPackage = (packageId: string) => {
    if (!packageId) {
      setLines([{ description: "", detail: "", qty: "1", pounds: "" }]);
      return;
    }
    adminFetch(`/api/admin/packages/${packageId}`)
      .then((r) => r.json())
      .then((pkg: PackageOpt | null) => {
        if (!pkg || !Array.isArray(pkg.line_items) || pkg.line_items.length === 0) {
          setLines([{ description: pkg?.name || "", detail: "", qty: "1", pounds: "" }]);
          return;
        }
        const rows: LineRow[] = pkg.line_items.map((li) => ({
          description: li.label || li.description || "Item",
          detail: li.description || "",
          qty: "1",
          pounds: ((li.amount_cents || 0) / 100).toFixed(2),
        }));
        setLines(rows);
      })
      .catch(() => setLines([{ description: "", detail: "", qty: "1", pounds: "" }]));
  };

  const lineTotalCents = useMemo(() => {
    return lines.reduce((s, row) => {
      const q = Math.max(1, parseInt(row.qty, 10) || 1);
      const p = parseFloat(row.pounds.replace(/[^0-9.]/g, "")) || 0;
      return s + Math.round(p * 100) * q;
    }, 0);
  }, [lines]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const taxCents = Math.round((parseFloat(form.tax_pounds) || 0) * 100);
    const line_items = lines
      .filter((r) => r.description.trim() || parseFloat(r.pounds) > 0)
      .map((r) => {
        const q = Math.max(1, parseInt(r.qty, 10) || 1);
        const unit = Math.round((parseFloat(r.pounds.replace(/[^0-9.]/g, "")) || 0) * 100);
        return {
          description: r.description.trim() || "Item",
          detail: r.detail.trim() || undefined,
          quantity: q,
          unit_cents: unit,
          line_total_cents: unit * q,
        };
      });
    if (!line_items.length) {
      await alert("Add at least one line with an amount.");
      setSaving(false);
      return;
    }
    const logoUrl = logoMode === "preferred" ? preferredLogoUrl : customLogoUrl;
    if (setAsPreferred && logoUrl) {
      try {
        await adminFetch("/api/admin/settings/invoice-logo", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: logoUrl }),
        });
      } catch {
        /* non-blocking */
      }
    }
    try {
      const res = await adminFetch("/api/admin/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: form.booking_id || null,
          client_name: form.client_name || null,
          client_email: form.client_email,
          client_address: form.client_address || null,
          due_date: form.due_date || null,
          tax_cents: taxCents,
          notes: form.notes || null,
          status: form.status,
          line_items,
          logo_url: logoUrl || undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      await alert(`Invoice ${d.invoice_number} created.`);
      router.push("/admin/invoices");
    } catch (err) {
      await alert(err instanceof Error ? err.message : "Failed to create invoice");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-inv-new">
      <div className="admin-page-banner">
        <header className="admin-bk-hero">
          <div className="admin-bk-hero-text">
            <Link href="/admin/invoices" className="admin-bkd-back">
              ← Invoices
            </Link>
            <p className="admin-dash-kicker">Finance</p>
            <h1 className="admin-page-title admin-bk-title">New invoice</h1>
            <p className="admin-lead admin-bk-lead">
              Link a booking or pick a package to fill line items. Add or edit lines, set bill-to details, then create. Logo appears on the PDF.
            </p>
          </div>
          <div className="admin-bk-hero-actions">
            <Link href="/admin/invoices" className="admin-btn admin-btn-ghost">
              Cancel
            </Link>
            <button type="submit" form="admin-new-invoice-form" className="admin-btn admin-btn-primary" disabled={saving}>
              {saving ? "Creating…" : "Create invoice"}
            </button>
          </div>
        </header>
      </div>

      <form id="admin-new-invoice-form" onSubmit={handleSubmit} className="admin-inv-new-form">
        <section className="admin-card admin-inv-new-card">
          <h2 className="admin-card-heading">Logo on PDF</h2>
          <div className="admin-inv-logo-options">
            <label className="admin-inv-logo-option">
              <input type="radio" name="logoMode" checked={logoMode === "preferred"} onChange={() => setLogoMode("preferred")} />
              <span>Use preferred logo</span>
              {preferredLogoUrl ? (
                <img src={preferredLogoUrl} alt="" className="admin-inv-logo-preview" />
              ) : (
                <span className="admin-inv-logo-hint">Set one in Settings or upload below.</span>
              )}
            </label>
            <label className="admin-inv-logo-option">
              <input type="radio" name="logoMode" checked={logoMode === "custom"} onChange={() => setLogoMode("custom")} />
              <span>Upload logo</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                className="admin-inv-logo-file"
                disabled={logoUploading}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setLogoUploading(true);
                  try {
                    const fd = new FormData();
                    fd.set("file", file);
                    const r = await adminFetch("/api/admin/invoices/upload-logo", { method: "POST", body: fd });
                    const d = await r.json();
                    if (!r.ok) throw new Error(d.error);
                    setCustomLogoUrl(d.url);
                    setLogoMode("custom");
                  } catch (err) {
                    await alert(err instanceof Error ? err.message : "Upload failed");
                  } finally {
                    setLogoUploading(false);
                    e.target.value = "";
                  }
                }}
              />
              {customLogoUrl && (
                <>
                  <img src={customLogoUrl} alt="" className="admin-inv-logo-preview" />
                  <label className="admin-inv-logo-set-preferred">
                    <input type="checkbox" checked={setAsPreferred} onChange={(e) => setSetAsPreferred(e.target.checked)} />
                    Set as preferred for future invoices
                  </label>
                </>
              )}
            </label>
          </div>
        </section>

        <section className="admin-card admin-inv-new-card">
          <h2 className="admin-card-heading">Source</h2>
          <div className="admin-form-grid">
            <div className="admin-form-group admin-form-full">
              <label>Link booking (optional)</label>
              <select
                value={form.booking_id}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm((f) => ({ ...f, booking_id: v }));
                  if (v) fillFromBooking(v);
                }}
              >
                <option value="">— None —</option>
                {bookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.booking_code ? `${b.booking_code} · ` : ""}
                    {b.event_date} · {b.client_name || b.client_email} {b.total_cents ? `· ${gbp(b.total_cents)}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-form-group admin-form-full">
              <label>Package (optional) — fills line items; you can add more lines below</label>
              <select
                value={form.package_id}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm((f) => ({ ...f, package_id: v }));
                  fillFromPackage(v);
                }}
              >
                <option value="">— None —</option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="admin-card admin-inv-new-card">
          <h2 className="admin-card-heading">Bill to & dates</h2>
          <div className="admin-form-grid">
            <div className="admin-form-group">
              <label>Due date</label>
              <input type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} />
            </div>
            <div className="admin-form-group">
              <label>Status</label>
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as (typeof STATUS)[number] }))}>
                {STATUS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="admin-form-group">
              <label>Bill to name</label>
              <input value={form.client_name} onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))} placeholder="Client or business name" />
            </div>
            <div className="admin-form-group">
              <label>Email</label>
              <input type="email" value={form.client_email} onChange={(e) => setForm((f) => ({ ...f, client_email: e.target.value }))} placeholder="billing@example.com" />
            </div>
            <div className="admin-form-group admin-form-full">
              <ClientAddressFields
                value={form.client_address}
                onChange={(client_address) => setForm((f) => ({ ...f, client_address }))}
              />
            </div>
            <div className="admin-form-group">
              <label>Tax (£)</label>
              <input value={form.tax_pounds} onChange={(e) => setForm((f) => ({ ...f, tax_pounds: e.target.value }))} placeholder="0" />
            </div>
          </div>
        </section>

        <section className="admin-card admin-inv-new-card">
          <h2 className="admin-card-heading">Line items</h2>
          <p className="admin-inv-new-hint">Add or edit lines. Select a package above to pre-fill, then add more if needed.</p>
          <div className="admin-inv-line-table-wrap">
            <table className="admin-inv-line-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Detail</th>
                  <th>Qty</th>
                  <th>Unit (£)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((row, i) => (
                  <tr key={i}>
                    <td>
                      <input
                        placeholder="Description"
                        value={row.description}
                        onChange={(e) => setLines((L) => L.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))}
                        className="admin-inv-new-input"
                      />
                    </td>
                    <td>
                      <input
                        placeholder="Detail"
                        value={row.detail}
                        onChange={(e) => setLines((L) => L.map((x, j) => (j === i ? { ...x, detail: e.target.value } : x)))}
                        className="admin-inv-new-input"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="1"
                        value={row.qty}
                        onChange={(e) => setLines((L) => L.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)))}
                        className="admin-inv-new-input admin-inv-new-qty"
                      />
                    </td>
                    <td>
                      <div className="admin-inv-line-pound">
                        <span>£</span>
                        <input
                          placeholder="0.00"
                          value={row.pounds}
                          onChange={(e) => setLines((L) => L.map((x, j) => (j === i ? { ...x, pounds: e.target.value } : x)))}
                          className="admin-inv-new-input admin-inv-new-pounds"
                        />
                      </div>
                    </td>
                    <td>
                      {lines.length > 1 ? (
                        <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setLines((L) => L.filter((_, j) => j !== i))} aria-label="Remove line">
                          ×
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className="admin-btn admin-btn-ghost admin-inv-add-line" onClick={() => setLines((L) => [...L, { description: "", detail: "", qty: "1", pounds: "" }])}>
            + Add line
          </button>
          <div className="admin-inv-new-totals">
            <span>Subtotal <strong>{gbp(lineTotalCents)}</strong></span>
            <span>+ tax → <strong>{gbp(lineTotalCents + Math.round((parseFloat(form.tax_pounds) || 0) * 100))}</strong></span>
          </div>
        </section>

        <section className="admin-card admin-inv-new-card">
          <h2 className="admin-card-heading">Notes / terms</h2>
          <p className="admin-inv-new-hint">Shown on the PDF footer block.</p>
          <textarea rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Payment terms…" className="admin-inv-new-textarea" />
        </section>

        <div className="admin-inv-new-actions">
          <Link href="/admin/invoices" className="admin-btn admin-btn-ghost">
            Cancel
          </Link>
          <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
            {saving ? "Creating…" : "Create invoice"}
          </button>
        </div>
      </form>
    </div>
  );
}
