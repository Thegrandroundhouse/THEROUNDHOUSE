"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { adminFetch } from "@/lib/admin-api-client";
import { useAdminDialog } from "@/components/admin/AdminDialogContext";
import type { StaffRow } from "../page";

export default function StaffDetailPage() {
  const { confirm, alert } = useAdminDialog();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [row, setRow] = useState<StaffRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    display_name: "",
    job_title: "",
    phone: "",
    notes: "",
    role: "staff",
    is_active: true,
  });
  const [passwordForm, setPasswordForm] = useState({ password: "", password2: "" });
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    adminFetch(`/api/admin/staff/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: StaffRow | null) => {
        if (!data) {
          setRow(null);
          return;
        }
        setRow(data);
        setForm({
          display_name: data.display_name ?? "",
          job_title: data.job_title ?? "",
          phone: data.phone ?? "",
          notes: data.notes ?? "",
          role: data.role,
          is_active: data.is_active,
        });
      })
      .catch(() => setRow(null))
      .finally(() => setLoading(false));
  }, [id]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await adminFetch(`/api/admin/staff/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: form.display_name.trim() || null,
          job_title: form.job_title.trim() || null,
          phone: form.phone.trim() || null,
          notes: form.notes.trim() || null,
          role: form.role,
          is_active: form.is_active,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Save failed");
      setRow(data);
      await alert("Saved.");
    } catch (err) {
      await alert(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (passwordForm.password !== passwordForm.password2) {
      await alert("Passwords do not match.");
      return;
    }
    if (passwordForm.password.length < 8) {
      await alert("Password must be at least 8 characters.");
      return;
    }
    setPasswordSaving(true);
    try {
      const res = await adminFetch(`/api/admin/staff/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordForm.password, password_confirm: passwordForm.password2 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to update password");
      setPasswordForm({ password: "", password2: "" });
      await alert("Password updated. They can sign in with the new password.");
    } catch (err) {
      await alert(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setPasswordSaving(false);
    }
  }

  async function remove() {
    if (!(await confirm("Remove this person? Their login will be deleted permanently.", { title: "Remove staff", variant: "danger", confirmLabel: "Remove" }))) return;
    const res = await adminFetch(`/api/admin/staff/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      await alert(d.error || "Failed");
      return;
    }
    router.replace("/admin/staff");
  }

  if (loading) {
    return <p className="admin-lead">Loading…</p>;
  }
  if (!row) {
    return (
      <div>
        <p className="admin-lead">Staff member not found.</p>
        <Link href="/admin/staff" className="admin-link">
          ← Back to staff
        </Link>
      </div>
    );
  }

  return (
    <div className="admin-staff-detail">
      <div className="admin-staff-detail-head">
        <Link href="/admin/staff" className="admin-staff-back">
          ← Staff
        </Link>
        <div className="admin-staff-detail-hero">
          <span className={`admin-staff-avatar admin-staff-avatar-lg ${row.role === "admin" ? "admin-staff-avatar--admin" : ""}`}>
            {(row.display_name || row.email).slice(0, 1).toUpperCase()}
          </span>
          <div>
            <h1 className="admin-page-title admin-staff-detail-title">{row.display_name || row.email}</h1>
            <p className="admin-staff-detail-email">{row.email}</p>
            <div className="admin-staff-detail-tags">
              <span className="admin-badge admin-badge-confirmed">{row.role}</span>
              {row.is_active ? (
                <span className="admin-badge admin-badge-new">Active</span>
              ) : (
                <span className="admin-badge admin-badge-lost">Inactive</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="admin-staff-detail-grid">
        <section className="admin-card admin-staff-detail-card">
          <h2 className="admin-card-heading">Profile & access</h2>
          <form onSubmit={save} className="admin-form">
            <div className="admin-form-group">
              <label>Display name</label>
              <input value={form.display_name} onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))} />
            </div>
            <div className="admin-form-group">
              <label>Job title</label>
              <input value={form.job_title} onChange={(e) => setForm((f) => ({ ...f, job_title: e.target.value }))} />
            </div>
            <div className="admin-form-group">
              <label>Phone</label>
              <input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="admin-form-group">
              <label>Role</label>
              <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="admin-form-group">
              <label>
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                />{" "}
                Active (inactive can block login)
              </label>
            </div>
            <div className="admin-form-group">
              <label>Internal notes</label>
              <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={4} />
            </div>
            <div className="admin-form-actions">
              <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </section>

        <section className="admin-card admin-staff-detail-card">
          <h2 className="admin-card-heading">Account</h2>
          <dl className="admin-dl admin-staff-dl">
            <dt>Email (login)</dt>
            <dd>
              <code className="admin-pre text-sm">{row.email}</code>
            </dd>
            <dt>User ID</dt>
            <dd className="text-xs text-[var(--color-text-muted)] break-all">{row.user_id || "—"}</dd>
            <dt>Staff record</dt>
            <dd className="text-xs text-[var(--color-text-muted)] break-all">{row.id}</dd>
          </dl>
          {row.user_id ? (
            <>
              <h3 className="admin-card-heading mt-6 text-base">Change password</h3>
              <form onSubmit={changePassword} className="admin-form">
                <div className="admin-form-group">
                  <label>New password (min 8 characters)</label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={passwordForm.password}
                    onChange={(e) => setPasswordForm((f) => ({ ...f, password: e.target.value }))}
                    minLength={8}
                    placeholder="New password"
                  />
                </div>
                <div className="admin-form-group">
                  <label>Confirm new password</label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={passwordForm.password2}
                    onChange={(e) => setPasswordForm((f) => ({ ...f, password2: e.target.value }))}
                    minLength={8}
                    placeholder="Confirm"
                  />
                </div>
                <div className="admin-form-actions">
                  <button type="submit" className="admin-btn admin-btn-primary" disabled={passwordSaving}>
                    {passwordSaving ? "Updating…" : "Update password"}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)] mt-4">No login linked — cannot change password.</p>
          )}
          <hr className="admin-hr" />
          <button type="button" className="admin-btn admin-btn-danger" onClick={remove}>
            Remove staff & delete login
          </button>
        </section>
      </div>
    </div>
  );
}
