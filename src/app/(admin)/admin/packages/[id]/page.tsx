"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { adminFetch } from "@/lib/admin-api-client";
import { useAdminDialog } from "@/components/admin/AdminDialogContext";

type PkgLine = { label: string; description: string; amount_cents: number };

const WHOLE_DAY_KEY = "whole_day";

function gbp(c: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(c / 100);
}

export default function PackageDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { confirm, alert } = useAdminDialog();
  const [pkg, setPkg] = useState<{
    name: string;
    description: string | null;
    active: boolean;
    base_price_cents: number | null;
    line_items: PkgLine[] | null;
    includes: string[];
    event_slot_keys?: string[] | null;
  } | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);
  const [lines, setLines] = useState<{ label: string; description: string; pounds: string }[]>([]);
  const [bullets, setBullets] = useState("");
  const [saving, setSaving] = useState(false);
  const [packageSlotKeys, setPackageSlotKeys] = useState<string[]>([]);
  const [slotDefs, setSlotDefs] = useState<{ key: string; label: string; timeLabel: string }[]>([]);
  const [slotsEnabled, setSlotsEnabled] = useState(false);
  const [allowWholeDay, setAllowWholeDay] = useState(true);
  const [wholeDayLabel, setWholeDayLabel] = useState(
    "Full venue (whole day) — blocks every other slot on this date.",
  );

  useEffect(() => {
    adminFetch("/api/admin/settings/booking-slots")
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (d: {
          enabled?: boolean;
          slots?: { key: string; label: string; timeLabel: string }[];
          allowWholeDay?: boolean;
          wholeDayLabel?: string;
        } | null) => {
          setSlotsEnabled(d?.enabled === true);
          setSlotDefs(Array.isArray(d?.slots) ? d.slots : []);
          setAllowWholeDay(d?.allowWholeDay !== false);
          setWholeDayLabel(
            typeof d?.wholeDayLabel === "string" && d.wholeDayLabel.trim()
              ? d.wholeDayLabel.trim()
              : "Full venue (whole day) — blocks every other slot on this date.",
          );
        },
      )
      .catch(() => {
        setSlotsEnabled(false);
        setSlotDefs([]);
        setAllowWholeDay(true);
        setWholeDayLabel("Full venue (whole day) — blocks every other slot on this date.");
      });
  }, []);

  useEffect(() => {
    adminFetch(`/api/admin/packages/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d && typeof d === "object") setPkg(d);
        setName(d?.name || "");
        setDescription(d?.description || "");
        setActive(d?.active !== false);
        const li = Array.isArray(d?.line_items) ? d.line_items : [];
        setLines(
          li.length
            ? li.map((x: PkgLine) => ({
                label: x.label || "",
                description: x.description || "",
                pounds: ((x.amount_cents || 0) / 100).toFixed(2),
              }))
            : [{ label: "", description: "", pounds: "" }],
        );
        const inc = Array.isArray(d?.includes) ? d.includes : [];
        setBullets(inc.join("\n"));
        const ek = Array.isArray(d?.event_slot_keys) ? d.event_slot_keys.filter((x: unknown): x is string => typeof x === "string") : [];
        setPackageSlotKeys(ek);
      });
  }, [id]);

  const totalPence = useMemo(() => {
    return lines.reduce((s, row) => s + Math.round((parseFloat(row.pounds.replace(/[^0-9.]/g, "")) || 0) * 100), 0);
  }, [lines]);

  const save = async () => {
    setSaving(true);
    const line_items: PkgLine[] = lines
      .filter((r) => r.label.trim() || parseFloat(r.pounds) > 0)
      .map((r) => ({
        label: r.label.trim() || "Item",
        description: r.description.trim(),
        amount_cents: Math.round((parseFloat(r.pounds.replace(/[^0-9.]/g, "")) || 0) * 100),
      }));
    const includes = bullets.split("\n").map((s) => s.trim()).filter(Boolean);
    try {
      const res = await adminFetch(`/api/admin/packages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
          active,
          line_items,
          includes,
          base_price_cents: totalPence || null,
          event_slot_keys: packageSlotKeys.length ? packageSlotKeys : [],
        }),
      });
      if (!res.ok) await alert(await res.text());
      else {
        const data = await res.json();
        setPkg(data);
        await alert("Saved.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (pkg == null && name === "") {
    return (
      <div className="admin-pkg-detail">
        <div className="admin-pkg-detail-loading">
          <p className="admin-lead">Loading…</p>
          <Link href="/admin/packages" className="admin-pkg-detail-back">← Packages</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-pkg-detail">
      <div className="admin-pkg-detail-top">
        <Link href="/admin/packages" className="admin-pkg-detail-back">← Packages</Link>
        <div className="admin-pkg-detail-actions">
          <Link href="/admin/bookings/new" className="admin-btn admin-btn-ghost">New booking</Link>
          <button type="button" className="admin-btn admin-btn-primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      <header className="admin-pkg-detail-hero">
        <h1 className="admin-pkg-detail-title">{name || "Package"}</h1>
        <span className={`admin-pkg-detail-pill ${active ? "admin-pkg-detail-pill--on" : "admin-pkg-detail-pill--off"}`}>
          {active ? "Active" : "Inactive"}
        </span>
        <p className="admin-pkg-detail-lead">
          Edit name, line items and inclusions. Active packages appear in the booking form.
        </p>
      </header>

      <div className="admin-pkg-detail-content">
        <section className="admin-pkg-detail-card">
          <h2 className="admin-pkg-detail-card-title">Details</h2>
          <div className="admin-pkg-detail-form">
            <div className="admin-form-group admin-form-full">
              <label>Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Package name" />
            </div>
            <div className="admin-form-group admin-form-full">
              <label>Description</label>
              <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Overview for proposals" />
            </div>
            <div className="admin-form-group admin-form-full">
              <label className="admin-pkg-detail-check-label">
                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
                <span>Active — shown in booking form</span>
              </label>
            </div>
          </div>
        </section>

        <section className="admin-pkg-detail-card">
          <h2 className="admin-pkg-detail-card-title">Line items</h2>
          <p className="admin-pkg-detail-hint">Each row can appear on invoices. Total updates automatically.</p>
          <div className="admin-pkg-detail-table-wrap">
            <table className="admin-pkg-detail-table">
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Detail</th>
                  <th className="admin-pkg-detail-th-amt">Amount</th>
                  <th className="admin-pkg-detail-th-action" aria-hidden />
                </tr>
              </thead>
              <tbody>
                {lines.map((row, i) => (
                  <tr key={i}>
                    <td>
                      <input
                        className="admin-pkg-detail-input"
                        placeholder="Label"
                        value={row.label}
                        onChange={(e) => setLines((L) => L.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                      />
                    </td>
                    <td>
                      <input
                        className="admin-pkg-detail-input"
                        placeholder="Detail"
                        value={row.description}
                        onChange={(e) => setLines((L) => L.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))}
                      />
                    </td>
                    <td className="admin-pkg-detail-td-amt">
                      <span className="admin-pkg-detail-pound">
                        <span className="admin-pkg-detail-pound-sym">£</span>
                        <input
                          value={row.pounds}
                          onChange={(e) => setLines((L) => L.map((x, j) => (j === i ? { ...x, pounds: e.target.value } : x)))}
                          placeholder="0.00"
                        />
                      </span>
                    </td>
                    <td className="admin-pkg-detail-td-action">
                      {lines.length > 1 ? (
                        <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm admin-pkg-detail-rm" onClick={() => setLines((L) => L.filter((_, j) => j !== i))} aria-label="Remove row">
                          Remove
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className="admin-btn admin-btn-ghost admin-pkg-detail-add-line" onClick={() => setLines((L) => [...L, { label: "", description: "", pounds: "" }])}>
            + Add line item
          </button>
          <div className="admin-pkg-detail-total">
            <span className="admin-pkg-detail-total-label">Total</span>
            <span className="admin-pkg-detail-total-value">{gbp(totalPence)}</span>
          </div>
        </section>

        {slotsEnabled && (slotDefs.length > 0 || allowWholeDay) ? (
          <section className="admin-pkg-detail-card">
            <h2 className="admin-pkg-detail-card-title">Time slots</h2>
            <p className="admin-pkg-detail-hint">
              This package only appears valid for checked options on new bookings. Include full venue for whole-day takeovers. None checked = any band or whole venue.
            </p>
            <div className="admin-pkg-slot-grid">
              {allowWholeDay ? (
                <label key={WHOLE_DAY_KEY} className="admin-pkg-slot-chip">
                  <input
                    type="checkbox"
                    checked={packageSlotKeys.includes(WHOLE_DAY_KEY)}
                    onChange={() =>
                      setPackageSlotKeys((prev) =>
                        prev.includes(WHOLE_DAY_KEY) ? prev.filter((k) => k !== WHOLE_DAY_KEY) : [...prev, WHOLE_DAY_KEY],
                      )
                    }
                  />
                  <span>
                    <strong>Full venue (whole day)</strong>
                    <small>{wholeDayLabel}</small>
                  </span>
                </label>
              ) : null}
              {slotDefs.map((s) => (
                <label key={s.key} className="admin-pkg-slot-chip">
                  <input
                    type="checkbox"
                    checked={packageSlotKeys.includes(s.key)}
                    onChange={() =>
                      setPackageSlotKeys((prev) =>
                        prev.includes(s.key) ? prev.filter((k) => k !== s.key) : [...prev, s.key],
                      )
                    }
                  />
                  <span>
                    <strong>{s.label}</strong>
                    {s.timeLabel ? <small>{s.timeLabel}</small> : null}
                  </span>
                </label>
              ))}
            </div>
          </section>
        ) : null}

        <section className="admin-pkg-detail-card">
          <h2 className="admin-pkg-detail-card-title">Inclusions</h2>
          <p className="admin-pkg-detail-hint">One per line — shown on website or proposals.</p>
          <textarea
            rows={5}
            value={bullets}
            onChange={(e) => setBullets(e.target.value)}
            placeholder="Dedicated coordinator&#10;12hr venue access&#10;…"
            className="admin-pkg-detail-textarea"
          />
        </section>

        <section className="admin-pkg-detail-card admin-pkg-detail-actions-card">
          <h2 className="admin-pkg-detail-card-title">Actions</h2>
          <div className="admin-pkg-detail-actions-row">
            <Link href="/admin/bookings/new" className="admin-btn admin-btn-primary">
              New booking with this package
            </Link>
            <button
              type="button"
              className="admin-btn admin-btn-ghost admin-btn-danger"
              onClick={async () => {
                if (!(await confirm("Delete this package? Bookings already using it will keep their copied data.", { variant: "danger" }))) return;
                const res = await adminFetch(`/api/admin/packages/${id}`, { method: "DELETE" });
                if (!res.ok) await alert(await res.text());
                else router.push("/admin/packages");
              }}
            >
              Delete package
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
