"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-api-client";
import { useAdminDialog } from "@/components/admin/AdminDialogContext";
import { AdminStatsCards } from "@/components/admin/AdminStatsCards";

export type StaffRow = {
  id: string;
  user_id: string | null;
  email: string;
  display_name: string | null;
  role: string;
  is_active: boolean;
  phone?: string | null;
  job_title?: string | null;
  notes?: string | null;
  created_at?: string;
};

export default function StaffPage() {
  const { alert } = useAdminDialog();
  const [list, setList] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    email: "",
    password: "",
    password2: "",
    display_name: "",
    job_title: "",
    phone: "",
    role: "staff",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const load = () => {
    adminFetch("/api/admin/staff")
      .then((r) => (r.ok ? r.json() : []))
      .then(setList)
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addForm.password !== addForm.password2) {
      await alert("Passwords do not match.");
      return;
    }
    if (addForm.password.length < 8) {
      await alert("Password must be at least 8 characters.");
      return;
    }
    setSaving(true);
    try {
      const res = await adminFetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: addForm.email.trim(),
          password: addForm.password,
          display_name: addForm.display_name.trim() || null,
          job_title: addForm.job_title.trim() || null,
          phone: addForm.phone.trim() || null,
          notes: addForm.notes.trim() || null,
          role: addForm.role,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || res.statusText);
      setAddForm({
        email: "",
        password: "",
        password2: "",
        display_name: "",
        job_title: "",
        phone: "",
        role: "staff",
        notes: "",
      });
      setShowAdd(false);
      load();
    } catch (err) {
      await alert(err instanceof Error ? err.message : "Failed to add staff");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-staff">
        <p className="admin-lead">Loading team…</p>
      </div>
    );
  }

  return (
    <div className="admin-staff">
      <div className="admin-page-banner">
        <header className="admin-staff-hero">
          <div>
            <p className="admin-dash-kicker">Directory</p>
            <h1 className="admin-page-title">Staff</h1>
            <p className="admin-lead admin-staff-lead">
              Create logins for your team. They sign in at <strong>/admin-login</strong>. View a row for full profile and edits.
            </p>
          </div>
          <button type="button" className="admin-btn admin-btn-primary" onClick={() => setShowAdd(!showAdd)}>
            {showAdd ? "Cancel" : "+ Add staff"}
          </button>
        </header>
      </div>

      <div className="admin-stats-unified-wrap">
        <AdminStatsCards
          ariaLabel="Staff summary"
          items={[
            { label: "Total staff", value: list.length },
            { label: "Active", value: list.filter((s) => s.is_active).length, variant: "ok" },
            { label: "Admins", value: list.filter((s) => s.role === "admin").length, variant: "gold" },
            { label: "Inactive", value: list.filter((s) => !s.is_active).length, hint: "No login" },
          ]}
        />
      </div>

      {showAdd && (
        <section className="admin-staff-form-card admin-card">
          <h2 className="admin-card-heading">New team member</h2>
          <form onSubmit={handleAdd} className="admin-form admin-form-grid">
            <div className="admin-form-group">
              <label>Work email *</label>
              <input
                type="email"
                autoComplete="off"
                value={addForm.email}
                onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </div>
            <div className="admin-form-group">
              <label>Display name</label>
              <input
                value={addForm.display_name}
                onChange={(e) => setAddForm((f) => ({ ...f, display_name: e.target.value }))}
                placeholder="e.g. Alex Morgan"
              />
            </div>
            <div className="admin-form-group">
              <label>Job title</label>
              <input
                value={addForm.job_title}
                onChange={(e) => setAddForm((f) => ({ ...f, job_title: e.target.value }))}
                placeholder="e.g. Events lead"
              />
            </div>
            <div className="admin-form-group">
              <label>Phone</label>
              <input
                type="tel"
                value={addForm.phone}
                onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="admin-form-group">
              <label>Password * (min 8 chars)</label>
              <input
                type="password"
                autoComplete="new-password"
                value={addForm.password}
                onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))}
                required
                minLength={8}
              />
            </div>
            <div className="admin-form-group">
              <label>Confirm password *</label>
              <input
                type="password"
                value={addForm.password2}
                onChange={(e) => setAddForm((f) => ({ ...f, password2: e.target.value }))}
                required
                minLength={8}
              />
            </div>
            <div className="admin-form-group">
              <label>Access role</label>
              <select value={addForm.role} onChange={(e) => setAddForm((f) => ({ ...f, role: e.target.value }))}>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="admin-form-group admin-form-full">
              <label>Internal notes</label>
              <textarea
                value={addForm.notes}
                onChange={(e) => setAddForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Optional — not shown to staff on login"
                rows={2}
              />
            </div>
            <div className="admin-form-actions admin-form-full">
              <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
                {saving ? "Creating…" : "Create account"}
              </button>
            </div>
          </form>
        </section>
      )}

      <div className="admin-card admin-unified-layout">
        <h2 className="admin-section-title">Staff</h2>
        {list.length === 0 ? (
          <p className="admin-table-empty">No staff yet. Add someone above — they’ll get email + password access.</p>
        ) : (
          <div className="admin-pay-table-wrap">
            <table className="admin-pay-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <span className="admin-pay-client">{s.display_name || "—"}</span>
                      {s.job_title ? <span className="admin-pay-sub">{s.job_title}</span> : null}
                    </td>
                    <td>{s.email}</td>
                    <td>{s.role}</td>
                    <td>{s.is_active ? "Active" : "Inactive"}</td>
                    <td>
                      <Link href={`/admin/staff/${s.id}`} className="admin-btn admin-btn-sm admin-btn-primary">
                        View profile
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
