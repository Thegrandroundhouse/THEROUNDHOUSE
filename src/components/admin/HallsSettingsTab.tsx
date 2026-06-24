"use client";

import { useEffect, useState } from "react";
import { adminFetch, parseAdminError } from "@/lib/admin-api-client";
import { useAdminDialog } from "@/components/admin/AdminDialogContext";

type Hall = { id: string; name: string; slug: string; capacity: number | null; sort_order: number };

export function HallsSettingsTab() {
  const { alert, confirm } = useAdminDialog();
  const [rows, setRows] = useState<Hall[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("");

  const load = () => {
    setLoading(true);
    adminFetch("/api/admin/spaces")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setRows(Array.isArray(d) ? d : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const addHall = async () => {
    if (!name.trim()) {
      await alert("Enter a hall name.");
      return;
    }
    setSaving(true);
    try {
      const r = await adminFetch("/api/admin/spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          capacity: capacity.trim() ? parseInt(capacity, 10) : null,
          sort_order: rows.length,
        }),
      });
      if (!r.ok) throw new Error(await parseAdminError(r, "Could not add hall"));
      setName("");
      setCapacity("");
      load();
    } catch (e) {
      await alert(e instanceof Error ? e.message : "Could not add hall");
    } finally {
      setSaving(false);
    }
  };

  const removeHall = async (h: Hall) => {
    if (!(await confirm(`Remove “${h.name}”?`, { title: "Delete hall", variant: "danger" }))) return;
    const r = await adminFetch(`/api/admin/spaces/${h.id}`, { method: "DELETE" });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      await alert(typeof d.error === "string" ? d.error : "Could not delete — hall may be linked to bookings.");
      return;
    }
    load();
  };

  return (
    <div className="admin-settings-v2-panel">
      <p className="admin-settings-v2-lead">
        Manage halls and rooms. The calendar, new bookings, enquiries, and contracts use these names. Block or book one hall or the whole venue.
      </p>
      {loading ? (
        <p className="admin-settings-loading">Loading halls…</p>
      ) : (
        <ul className="admin-settings-halls-list">
          {rows.map((h) => (
            <li key={h.id} className="admin-settings-halls-row">
              <strong>{h.name}</strong>
              {h.capacity ? <span className="admin-settings-halls-cap">{h.capacity} guests</span> : null}
              <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => removeHall(h)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="admin-settings-v2-grid" style={{ marginTop: "1.25rem" }}>
        <div className="admin-settings-v2-field">
          <label htmlFor="new-hall-name">New hall name</label>
          <input
            id="new-hall-name"
            className="admin-settings-v2-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Hall Two"
          />
        </div>
        <div className="admin-settings-v2-field">
          <label htmlFor="new-hall-cap">Capacity (optional)</label>
          <input
            id="new-hall-cap"
            className="admin-settings-v2-input"
            type="number"
            min={1}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            placeholder="300"
          />
        </div>
      </div>
      <button type="button" className="admin-btn admin-btn-primary" disabled={saving} onClick={addHall} style={{ marginTop: "0.75rem" }}>
        {saving ? "Adding…" : "Add hall"}
      </button>
    </div>
  );
}
