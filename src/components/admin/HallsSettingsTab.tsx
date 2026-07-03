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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCapacity, setEditCapacity] = useState("");
  const [editSaving, setEditSaving] = useState(false);

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

  const startEdit = (h: Hall) => {
    setEditingId(h.id);
    setEditName(h.name);
    setEditCapacity(h.capacity != null ? String(h.capacity) : "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditCapacity("");
  };

  const saveEdit = async (h: Hall) => {
    const trimmed = editName.trim();
    if (!trimmed) {
      await alert("Enter a hall name.");
      return;
    }
    setEditSaving(true);
    try {
      const cap = editCapacity.trim();
      const r = await adminFetch(`/api/admin/spaces/${h.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          capacity: cap ? parseInt(cap, 10) : null,
        }),
      });
      if (!r.ok) throw new Error(await parseAdminError(r, "Could not save hall"));
      cancelEdit();
      load();
    } catch (e) {
      await alert(e instanceof Error ? e.message : "Could not save hall");
    } finally {
      setEditSaving(false);
    }
  };

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
    if (
      !(await confirm(
        `Remove “${h.name}”? Any bookings linked to this hall will be kept, but will no longer be assigned to it.`,
        { title: "Delete hall", variant: "danger", confirmLabel: "Remove hall" },
      ))
    ) {
      return;
    }
    const r = await adminFetch(`/api/admin/spaces/${h.id}`, { method: "DELETE" });
    if (!r.ok) {
      const d = (await r.json().catch(() => ({}))) as { error?: string };
      await alert(typeof d.error === "string" ? d.error : "Could not delete this hall.");
      return;
    }
    if (editingId === h.id) cancelEdit();
    load();
  };

  return (
    <div className="admin-settings-v2-panel">
      <p className="admin-settings-v2-lead">
        Manage halls and rooms. Rename halls here — the new names appear on the calendar, bookings, enquiries, and contracts.
      </p>
      {loading ? (
        <p className="admin-settings-loading">Loading halls…</p>
      ) : (
        <ul className="admin-settings-halls-list">
          {rows.map((h) => (
            <li key={h.id} className="admin-settings-halls-row">
              {editingId === h.id ? (
                <>
                  <input
                    className="admin-settings-v2-input admin-settings-halls-edit-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Hall name"
                    aria-label="Hall name"
                  />
                  <input
                    className="admin-settings-v2-input admin-settings-halls-edit-cap"
                    type="number"
                    min={1}
                    value={editCapacity}
                    onChange={(e) => setEditCapacity(e.target.value)}
                    placeholder="Capacity"
                    aria-label="Capacity"
                  />
                  <div className="admin-settings-halls-row-actions">
                    <button
                      type="button"
                      className="admin-btn admin-btn-primary admin-btn-sm"
                      disabled={editSaving}
                      onClick={() => void saveEdit(h)}
                    >
                      {editSaving ? "Saving…" : "Save"}
                    </button>
                    <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" disabled={editSaving} onClick={cancelEdit}>
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <strong className="admin-settings-halls-name">{h.name}</strong>
                  {h.capacity ? <span className="admin-settings-halls-cap">{h.capacity} guests</span> : null}
                  <div className="admin-settings-halls-row-actions">
                    <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => startEdit(h)}>
                      Rename
                    </button>
                    <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => void removeHall(h)}>
                      Remove
                    </button>
                  </div>
                </>
              )}
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
            placeholder="e.g. Grand Ballroom"
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
      <button type="button" className="admin-btn admin-btn-primary" disabled={saving} onClick={() => void addHall()} style={{ marginTop: "0.75rem" }}>
        {saving ? "Adding…" : "Add hall"}
      </button>
    </div>
  );
}
