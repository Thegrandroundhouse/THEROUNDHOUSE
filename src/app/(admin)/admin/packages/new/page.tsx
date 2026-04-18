"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/lib/admin-api-client";
import { useAdminDialog } from "@/components/admin/AdminDialogContext";
import type { PkgLine } from "@/app/(admin)/admin/packages/page";

type SlotDef = { key: string; label: string; timeLabel: string };

const WHOLE_DAY_KEY = "whole_day";

function gbp(c: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(c / 100);
}

export default function NewPackagePage() {
  const router = useRouter();
  const { alert } = useAdminDialog();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<{ label: string; description: string; pounds: string }[]>([
    { label: "", description: "", pounds: "" },
  ]);
  const [bullets, setBullets] = useState("");
  const [packageSlotKeys, setPackageSlotKeys] = useState<string[]>([]);
  const [slotDefs, setSlotDefs] = useState<SlotDef[]>([]);
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
          slots?: SlotDef[];
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

  const totalPence = useMemo(() => {
    return lines.reduce((s, row) => s + Math.round((parseFloat(row.pounds.replace(/[^0-9.]/g, "")) || 0) * 100), 0);
  }, [lines]);

  const submitPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      await alert("Package name required");
      return;
    }
    const line_items: PkgLine[] = lines
      .filter((r) => r.label.trim() || parseFloat(r.pounds) > 0)
      .map((r) => ({
        label: r.label.trim() || "Item",
        description: r.description.trim(),
        amount_cents: Math.round((parseFloat(r.pounds.replace(/[^0-9.]/g, "")) || 0) * 100),
      }));
    const includes = bullets.split("\n").map((s) => s.trim()).filter(Boolean);
    setSaving(true);
    try {
      const res = await adminFetch("/api/admin/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          line_items,
          includes,
          base_price_cents: totalPence || null,
          event_slot_keys: packageSlotKeys.length ? packageSlotKeys : [],
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      router.push(`/admin/packages/${d.id}`);
    } catch (err) {
      await alert(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-pkg-page admin-pkg-new-page">
      <div className="admin-page-banner">
        <header className="admin-bk-hero">
          <div className="admin-bk-hero-text">
            <Link href="/admin/packages" className="admin-bkd-back">
              ← Packages
            </Link>
            <p className="admin-dash-kicker">Catalog</p>
            <h1 className="admin-page-title admin-bk-title">New package</h1>
            <p className="admin-lead admin-bk-lead">
              Add line items, inclusions, and optional time slots. Total is the sum of line amounts. You’ll open the package to edit anytime.
            </p>
          </div>
          <div className="admin-bk-hero-actions">
            <Link href="/admin/packages" className="admin-btn admin-btn-ghost">
              Cancel
            </Link>
            <button type="submit" form="admin-new-package-form" className="admin-btn admin-btn-primary" disabled={saving}>
              {saving ? "Creating…" : "Create package"}
            </button>
          </div>
        </header>
      </div>

      <form id="admin-new-package-form" onSubmit={submitPackage} className="admin-pkg-new-form admin-card admin-unified-layout">
        <div className="admin-form-group admin-form-full">
          <label>Package name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Gold weekend" className="admin-table-inline-input" />
        </div>
        <div className="admin-form-group admin-form-full">
          <label>Description (overview)</label>
          <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this package is best for…" />
        </div>

        <h2 className="admin-section-title" style={{ marginTop: "0.5rem" }}>Priced line items</h2>
        <p className="admin-pkg-lines-hint">Each row is one invoice-style line — label, optional detail, amount in £.</p>
        {lines.map((row, i) => (
          <div key={i} className="admin-pkg-line admin-pkg-new-line">
            <input
              placeholder="Label (e.g. Venue hire)"
              value={row.label}
              onChange={(e) => setLines((L) => L.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
            />
            <input
              placeholder="Detail / notes"
              value={row.description}
              onChange={(e) => setLines((L) => L.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))}
            />
            <div className="admin-inv-line-pound">
              <span>£</span>
              <input
                placeholder="0"
                value={row.pounds}
                onChange={(e) => setLines((L) => L.map((x, j) => (j === i ? { ...x, pounds: e.target.value } : x)))}
              />
            </div>
            {lines.length > 1 ? (
              <button type="button" className="admin-inv-line-rm" onClick={() => setLines((L) => L.filter((_, j) => j !== i))}>
                ×
              </button>
            ) : null}
          </div>
        ))}
        <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setLines((L) => [...L, { label: "", description: "", pounds: "" }])}>
          + Line item
        </button>
        <div className="admin-pkg-total-preview" style={{ marginTop: "0.75rem" }}>
          Package total: <strong>{gbp(totalPence)}</strong>
        </div>

        {slotsEnabled && (slotDefs.length > 0 || allowWholeDay) ? (
          <div className="admin-form-group admin-form-full" style={{ marginTop: "1.25rem" }}>
            <label>Time slots for this package</label>
            <p className="admin-pkg-lines-hint" style={{ marginTop: 0 }}>
              Choose which slots this offer applies to. Include <strong>full venue</strong> if the price is for a whole-day takeover. Leave all unchecked ={" "}
              <strong>any</strong> band or whole day.
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
          </div>
        ) : null}

        <div className="admin-form-group admin-form-full">
          <label>Inclusions (one per line)</label>
          <textarea rows={4} value={bullets} onChange={(e) => setBullets(e.target.value)} placeholder="Dedicated coordinator&#10;12hr access&#10;…" />
        </div>

        <div className="admin-form-actions admin-form-full" style={{ marginTop: "1rem" }}>
          <Link href="/admin/packages" className="admin-btn admin-btn-ghost">
            Cancel
          </Link>
          <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
            {saving ? "Creating…" : "Create package"}
          </button>
        </div>
      </form>
    </div>
  );
}
