"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-api-client";
import { useAdminDialog } from "@/components/admin/AdminDialogContext";
import { VENDOR_TYPE_CUSTOM, VENDOR_TYPE_OPTIONS } from "@/lib/vendor-types";

type CustomRow = { key: string; value: string };

function slugCustomType(raw: string): string {
  const t = raw.trim().toLowerCase();
  if (!t) return "";
  return t
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

export default function NewVendorPage() {
  const { alert } = useAdminDialog();
  const router = useRouter();
  const [typeChoice, setTypeChoice] = useState("photographer");
  const [customType, setCustomType] = useState("");
  const [f, setF] = useState({
    name: "",
    email: "",
    phone: "",
    preferred: false,
    notes: "",
    commission_notes: "",
    trade_pounds: "",
    customer_pounds: "",
  });
  const [customRows, setCustomRows] = useState<CustomRow[]>([
    { key: "", value: "" },
    { key: "", value: "" },
  ]);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!f.name.trim()) {
      await alert("Name is required");
      return;
    }
    let vendor_type: string;
    if (typeChoice === VENDOR_TYPE_CUSTOM) {
      vendor_type = slugCustomType(customType);
      if (!vendor_type) {
        await alert("Enter a custom type name, or pick one from the list.");
        return;
      }
    } else {
      vendor_type = typeChoice;
    }
    const custom_fields: Record<string, string> = {};
    for (const row of customRows) {
      if (row.key.trim()) custom_fields[row.key.trim()] = row.value;
    }
    const trade_price_cents = f.trade_pounds.trim() ? Math.round(parseFloat(f.trade_pounds) * 100) : null;
    const customer_price_cents = f.customer_pounds.trim() ? Math.round(parseFloat(f.customer_pounds) * 100) : null;
    setSaving(true);
    try {
      const res = await adminFetch("/api/admin/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...f,
          vendor_type,
          trade_price_cents,
          customer_price_cents,
          custom_fields,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        await alert(d.error || "Failed");
        return;
      }
      router.push(`/admin/vendors/${d.id}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-vnd-new admin-crm-wide">
      <div className="admin-page-banner">
        <header className="admin-bk-hero admin-vnd-new-hero">
          <div className="admin-bk-hero-text">
            <Link href="/admin/vendors" className="admin-bkd-back">
              ← Vendors
            </Link>
            <p className="admin-dash-kicker">Suppliers</p>
            <h1 className="admin-page-title admin-bk-title">Add supplier</h1>
            <p className="admin-lead admin-bk-lead admin-vnd-new-lead">
              Choose from 50 supplier types or define your own. Add custom fields for VAT, portals, insurance — anything specific to them.
            </p>
          </div>
          <div className="admin-bk-hero-actions">
            <Link href="/admin/vendors" className="admin-btn admin-btn-ghost">
              Cancel
            </Link>
            <button type="button" className="admin-btn admin-btn-primary" onClick={() => void submit()} disabled={saving}>
              {saving ? "Creating…" : "Create supplier"}
            </button>
          </div>
        </header>
      </div>

      <div className="admin-vnd-new-grid">
        <section className="admin-vnd-new-card" aria-labelledby="vnd-profile-heading">
          <div className="admin-vnd-new-card-head">
            <h2 id="vnd-profile-heading" className="admin-vnd-new-card-title">
              Profile
            </h2>
            <p className="admin-vnd-new-card-desc">Category and how you reach them</p>
          </div>

          <div className="admin-form-group admin-form-full">
            <label htmlFor="vnd-type">Type</label>
            <select
              id="vnd-type"
              className="admin-vnd-type-dropdown"
              value={typeChoice}
              onChange={(e) => {
                const v = e.target.value;
                setTypeChoice(v);
                if (v !== VENDOR_TYPE_CUSTOM) setCustomType("");
              }}
            >
              {VENDOR_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
              <option value={VENDOR_TYPE_CUSTOM}>Custom type…</option>
            </select>
            <p className="admin-vnd-new-hint admin-vnd-new-hint--tight">
              {VENDOR_TYPE_OPTIONS.length} standard categories. Pick <strong>Custom type…</strong> if yours isn&apos;t listed.
            </p>
          </div>
          {typeChoice === VENDOR_TYPE_CUSTOM ? (
            <div className="admin-form-group admin-form-full">
              <label htmlFor="vnd-type-custom">Custom type name</label>
              <input
                id="vnd-type-custom"
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                placeholder="e.g. Toastmaster, Laser show, Stilt walker…"
                autoComplete="off"
              />
              <p className="admin-vnd-new-hint admin-vnd-new-hint--tight">
                Saved as a short tag (e.g. <code>toastmaster</code>). Use <strong>Custom fields</strong> below for longer notes, URLs, refs.
              </p>
            </div>
          ) : null}

          <div className="admin-form-grid admin-vnd-new-form-tight">
            <div className="admin-form-group admin-form-full">
              <label htmlFor="vnd-name">Business or contact name *</label>
              <input
                id="vnd-name"
                value={f.name}
                onChange={(e) => setF((x) => ({ ...x, name: e.target.value }))}
                placeholder="e.g. Northlight Photography"
                autoComplete="organization"
              />
            </div>
            <div className="admin-form-group">
              <label htmlFor="vnd-email">Email</label>
              <input
                id="vnd-email"
                type="email"
                value={f.email}
                onChange={(e) => setF((x) => ({ ...x, email: e.target.value }))}
                placeholder="contact@example.com"
                autoComplete="email"
              />
            </div>
            <div className="admin-form-group">
              <label htmlFor="vnd-phone">Phone</label>
              <input
                id="vnd-phone"
                type="tel"
                value={f.phone}
                onChange={(e) => setF((x) => ({ ...x, phone: e.target.value }))}
                placeholder="Optional"
                autoComplete="tel"
              />
            </div>
          </div>

          <div className="admin-vnd-new-divider" />

          <label
            className={`admin-vnd-preferred${f.preferred ? " admin-vnd-preferred--on" : ""}`}
            htmlFor="vnd-preferred"
          >
            <input
              id="vnd-preferred"
              type="checkbox"
              className="admin-vnd-preferred-input"
              checked={f.preferred}
              onChange={(e) => setF((x) => ({ ...x, preferred: e.target.checked }))}
            />
            <span className="admin-vnd-preferred-copy">
              <span className="admin-vnd-preferred-title">Preferred supplier</span>
              <span className="admin-vnd-preferred-sub">Surfaces first in lists and vendor pickers on bookings.</span>
            </span>
          </label>
        </section>

        <section className="admin-vnd-new-card" aria-labelledby="vnd-pricing-heading">
          <div className="admin-vnd-new-card-head">
            <h2 id="vnd-pricing-heading" className="admin-vnd-new-card-title">
              Pricing (£)
            </h2>
            <p className="admin-vnd-new-card-desc">Your cost vs what you quote couples — for margin reference only</p>
          </div>
          <div className="admin-form-grid">
            <div className="admin-form-group">
              <label htmlFor="vnd-trade">Trade price</label>
              <div className="admin-inv-line-pound">
                <span aria-hidden>£</span>
                <input
                  id="vnd-trade"
                  inputMode="decimal"
                  value={f.trade_pounds}
                  onChange={(e) => setF((x) => ({ ...x, trade_pounds: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="admin-form-group">
              <label htmlFor="vnd-customer">Customer / list price</label>
              <div className="admin-inv-line-pound">
                <span aria-hidden>£</span>
                <input
                  id="vnd-customer"
                  inputMode="decimal"
                  value={f.customer_pounds}
                  onChange={(e) => setF((x) => ({ ...x, customer_pounds: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="admin-vnd-new-card admin-vnd-new-card--wide" aria-labelledby="vnd-custom-heading">
          <div className="admin-vnd-new-card-head">
            <h2 id="vnd-custom-heading" className="admin-vnd-new-card-title">
              Custom fields
            </h2>
            <p className="admin-vnd-new-card-desc">
              Your own key/value pairs for <strong>this supplier only</strong> — VAT number, portal login, insurance renewal date, bank details,
              contract ref, preferred contact method, anything that doesn&apos;t fit the type dropdown.
            </p>
          </div>
          <ul className="admin-vnd-custom-rows" aria-label="Custom field rows">
            {customRows.map((row, i) => (
              <li key={i} className="admin-vnd-custom-row">
                <div className="admin-vnd-custom-cell">
                  <label className="visually-hidden" htmlFor={`vnd-cf-k-${i}`}>
                    Field label
                  </label>
                  <input
                    id={`vnd-cf-k-${i}`}
                    className="admin-vnd-custom-input"
                    placeholder="Label (e.g. VAT number)"
                    value={row.key}
                    onChange={(e) => setCustomRows((R) => R.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))}
                  />
                </div>
                <div className="admin-vnd-custom-cell admin-vnd-custom-cell--grow">
                  <label className="visually-hidden" htmlFor={`vnd-cf-v-${i}`}>
                    Value
                  </label>
                  <input
                    id={`vnd-cf-v-${i}`}
                    className="admin-vnd-custom-input"
                    placeholder="Value"
                    value={row.value}
                    onChange={(e) => setCustomRows((R) => R.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                  />
                </div>
                <div className="admin-vnd-custom-rm">
                  {customRows.length > 1 ? (
                    <button
                      type="button"
                      className="admin-vnd-custom-remove"
                      onClick={() => setCustomRows((R) => R.filter((_, j) => j !== i))}
                      aria-label="Remove this field"
                    >
                      ×
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="admin-btn admin-btn-ghost admin-btn-sm admin-vnd-custom-add"
            onClick={() => setCustomRows((R) => [...R, { key: "", value: "" }])}
          >
            + Add field
          </button>
        </section>

        <section className="admin-vnd-new-card admin-vnd-new-card--wide" aria-labelledby="vnd-notes-heading">
          <div className="admin-vnd-new-card-head">
            <h2 id="vnd-notes-heading" className="admin-vnd-new-card-title">
              Internal notes
            </h2>
            <p className="admin-vnd-new-card-desc">Only visible in admin</p>
          </div>
          <div className="admin-form-grid">
            <div className="admin-form-group admin-form-full">
              <label htmlFor="vnd-notes">General</label>
              <textarea
                id="vnd-notes"
                rows={3}
                value={f.notes}
                onChange={(e) => setF((x) => ({ ...x, notes: e.target.value }))}
                placeholder="Anything the team should know…"
              />
            </div>
            <div className="admin-form-group admin-form-full">
              <label htmlFor="vnd-commission">Commission / referral</label>
              <textarea
                id="vnd-commission"
                rows={2}
                value={f.commission_notes}
                onChange={(e) => setF((x) => ({ ...x, commission_notes: e.target.value }))}
                placeholder="Optional"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
