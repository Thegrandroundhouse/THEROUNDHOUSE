"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-api-client";
import { useAdminDialog } from "@/components/admin/AdminDialogContext";
import { VENUE_BRAND_NAME } from "@/lib/venue-constants";

type Template = {
  id: string;
  name: string;
  slug: string;
  is_preferred: boolean;
  body: string;
  updated_at: string;
  is_system?: boolean;
};

export default function AgreementsPage() {
  const { alert, confirm } = useAdminDialog();
  const [rows, setRows] = useState<Template[]>([]);
  const [migration, setMigration] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = () => {
    adminFetch("/api/admin/agreement-templates")
      .then((r) => r.json())
      .then((d: { rows?: Template[]; needsMigration?: boolean }) => {
        if (d.needsMigration) setMigration(true);
        setRows(d.rows || []);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (t: Template) => {
    if (t.is_system) {
      await alert("Library templates cannot be deleted. Create a copy from New template to customize.");
      return;
    }
    if (!(await confirm(`Delete “${t.name}”?`, { title: "Delete template", variant: "danger" }))) return;
    setDeleting(t.id);
    try {
      const r = await adminFetch(`/api/admin/agreement-templates/${t.id}`, { method: "DELETE" });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        await alert(j.error || "Could not delete");
        return;
      }
      load();
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="admin-pay admin-crm-wide">
      <div className="admin-page-banner">
        <header className="admin-bk-hero">
          <div className="admin-bk-hero-text">
            <p className="admin-dash-kicker">Legal &amp; hire</p>
            <h1 className="admin-page-title admin-bk-title">Agreements</h1>
            <p className="admin-lead admin-bk-lead">
              <strong>{VENUE_BRAND_NAME}</strong> hire contracts (4-page PDF + optional T&amp;C) pull line items, totals,
              and payment schedule from bookings. Legacy text templates remain available. Business details on{" "}
              <Link href="/admin/settings" className="admin-link">
                Settings → Business
              </Link>
              .
            </p>
          </div>
          <div className="admin-bk-hero-actions">
            <Link href="/admin/agreements/new" className="admin-btn admin-btn-primary">
              New template
            </Link>
            <Link href="/admin/bookings" className="admin-btn admin-btn-ghost">
              Bookings
            </Link>
          </div>
        </header>
      </div>

      {migration && (
        <div className="admin-pay-banner">
          Run migration <code>029_agreements.sql</code> to enable agreements.
        </div>
      )}

      {loading ? (
        <p className="admin-page-desc">Loading…</p>
      ) : (
        <div className="admin-card admin-unified-layout">
          <h2 className="admin-section-title">Templates</h2>
          <div className="admin-pay-table-wrap">
            <table className="admin-pay-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Slug</th>
                  <th>Type</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && !migration ? (
                  <tr>
                    <td colSpan={4} className="admin-pay-empty">
                      No templates yet. Create one or run migrations for defaults.
                    </td>
                  </tr>
                ) : (
                  rows.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <strong>{t.name}</strong>
                        {t.is_preferred ? (
                          <span className="admin-ag-list-preferred">Preferred</span>
                        ) : null}
                      </td>
                      <td>
                        <code className="admin-bk-code">{t.slug}</code>
                      </td>
                      <td>{t.is_system ? <span className="admin-badge admin-badge-pending">Library</span> : "Custom"}</td>
                      <td>
                        <div className="admin-ag-list-actions">
                          <Link href={`/admin/agreements/${t.id}`} className="admin-btn admin-btn-sm admin-btn-primary">
                            View
                          </Link>
                          {!t.is_system ? (
                            <button
                              type="button"
                              className="admin-btn admin-btn-sm admin-btn-ghost admin-btn-danger"
                              disabled={deleting === t.id}
                              onClick={() => remove(t)}
                            >
                              {deleting === t.id ? "…" : "Delete"}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="admin-vnd-new-hint" style={{ marginTop: "1.25rem" }}>
            Placeholders: <code>{"{{venueName}}"}</code> <code>{"{{client_name}}"}</code> <code>{"{{event_date}}"}</code>{" "}
            <code>{"{{booking_code}}"}</code> <code>{"{{event_slot_label}}"}</code> <code>{"{{total_gbp}}"}</code> — plus custom
            fields.
          </p>
        </div>
      )}
    </div>
  );
}
