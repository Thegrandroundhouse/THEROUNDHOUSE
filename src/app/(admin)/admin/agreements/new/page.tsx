"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminFetch, parseAdminError } from "@/lib/admin-api-client";
import { useAdminDialog } from "@/components/admin/AdminDialogContext";
import { AdminMigrationBanner } from "@/components/admin/AdminMigrationBanner";
import { AgreementLivePreview } from "@/components/admin/AgreementLivePreview";
import { mergeAgreementBody, AGREEMENT_EDITOR_PREVIEW_VARS } from "@/lib/agreement-merge";

const PLACEHOLDER_HELP =
  "{{venueName}} {{client_name}} {{client_email}} {{event_date}} {{booking_code}} {{event_slot_label}} {{total_gbp}} {{event_type}} {{package_name}} {{guest_count}} {{deposit_gbp}} {{balance_gbp}} {{vendors_list}} {{payment_schedule}} {{extras_block}} {{special_requirements_block}}";

type TemplateRow = { id: string; name: string; slug: string; body: string; is_preferred: boolean; sort_order: number };

function NewAgreementTemplateInner() {
  const { alert } = useAdminDialog();
  const router = useRouter();
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [preferred, setPreferred] = useState(false);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [migration, setMigration] = useState(false);
  const [venue, setVenue] = useState({ name: "The Roundhouse", tagline: "" });

  useEffect(() => {
    adminFetch("/api/admin/agreement-templates")
      .then((r) => (r.ok ? r.json() : { rows: [] }))
      .then((d: { rows?: TemplateRow[]; needsMigration?: boolean }) => {
        if (d.needsMigration) {
          setMigration(true);
          setTemplates([]);
          return;
        }
        const list = Array.isArray(d?.rows) ? d.rows : [];
        setTemplates(list.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name)));
        const hire = list.find((t) => t.slug === "venue-hire-default") || list[0];
        if (hire?.body) {
          setBody(hire.body);
          if (!name) setName(`${hire.name} (copy)`);
        }
      })
      .catch(() => setTemplates([]));
    adminFetch("/api/admin/settings/invoice-business")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { venueName?: string; venueTagline?: string } | null) => {
        setVenue({
          name: d?.venueName || AGREEMENT_EDITOR_PREVIEW_VARS.venueName,
          tagline: d?.venueTagline || "",
        });
      })
      .catch(() => setVenue({ name: AGREEMENT_EDITOR_PREVIEW_VARS.venueName, tagline: "" }));
  }, []);

  const previewVars: Record<string, string> = useMemo(
    () => ({
      ...AGREEMENT_EDITOR_PREVIEW_VARS,
      venueName: venue.name || AGREEMENT_EDITOR_PREVIEW_VARS.venueName,
    }),
    [venue.name],
  );

  const mergedPreview = useMemo(() => mergeAgreementBody(body || "—", previewVars), [body, previewVars]);

  const applyStarter = (slug: string) => {
    const t = templates.find((x) => x.slug === slug);
    if (t) {
      setBody(t.body);
      setName(`${t.name} (copy)`);
    }
  };

  const submit = async () => {
    if (!name.trim()) {
      await alert("Name is required");
      return;
    }
    if (!body.trim()) {
      await alert("Agreement body is required");
      return;
    }
    setSaving(true);
    try {
      const r = await adminFetch("/api/admin/agreement-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), body, is_preferred: preferred, custom_fields: [] }),
      });
      if (!r.ok) throw new Error(await parseAdminError(r, "Couldn’t create template"));
      const d = await r.json();
      router.push(`/admin/agreements/${d.id}`);
    } catch (e) {
      await alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const starters = [
    { slug: "venue-hire-default", label: "Venue hire", desc: "Full hire layout" },
    { slug: "deposit-schedule", label: "Deposit & schedule", desc: "Payment milestones" },
    { slug: "balance-final", label: "Balance reminder", desc: "Final balance" },
    { slug: "supplier-access", label: "Supplier access", desc: "Vendor terms" },
  ];

  return (
    <div className="admin-ag-new-v2 admin-crm-wide">
      <div className="admin-page-banner">
        <header className="admin-bk-hero admin-ag-new-v2-hero">
          <div className="admin-bk-hero-text">
            <Link href="/admin/agreements" className="admin-ag-new-v2-back">
              ← Agreements
            </Link>
            <p className="admin-dash-kicker">Library</p>
            <h1 className="admin-page-title admin-bk-title">New agreement template</h1>
            <p className="admin-lead admin-bk-lead">
              Pick a <strong>starter</strong>, name it, edit the body — preview matches the <strong>PDF</strong>. Generate from a booking uses live data.
            </p>
          </div>
          <div className="admin-bk-hero-actions admin-ag-new-v2-hero-actions">
            <Link href="/admin/agreements" className="admin-btn admin-btn-ghost">
              Cancel
            </Link>
            <button type="button" className="admin-btn admin-btn-primary" disabled={saving} onClick={submit}>
              {saving ? "Saving…" : "Create template"}
            </button>
          </div>
        </header>
      </div>

      {migration ? (
        <AdminMigrationBanner migrationCode="039_banqueting_contract_templates.sql" feature="agreement templates" />
      ) : null}

      <div className="admin-ag-new-v2-grid">
        <div className="admin-ag-new-v2-editor">
          <section className="admin-card admin-ag-new-v2-card">
            <h2 className="admin-ag-new-v2-h2">Starters</h2>
            <p className="admin-ag-new-v2-muted">One tap loads copy-safe text (migration <code>037</code> if templates missing).</p>
            <div className="admin-ag-new-v2-starters">
              {starters.map((s) => (
                <button key={s.slug} type="button" className="admin-ag-new-v2-starter" onClick={() => applyStarter(s.slug)}>
                  <span className="admin-ag-new-v2-starter-label">{s.label}</span>
                  <span className="admin-ag-new-v2-starter-desc">{s.desc}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="admin-card admin-ag-new-v2-card">
            <div className="admin-ag-new-v2-fields">
              <div className="admin-form-group">
                <label htmlFor="ag-new-name">Template name</label>
                <input
                  id="ag-new-name"
                  className="admin-ag-new-v2-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Standard venue hire 2026"
                  autoComplete="off"
                />
              </div>
              <label className="admin-bk-slot-whole admin-ag-new-v2-check">
                <input type="checkbox" checked={preferred} onChange={(e) => setPreferred(e.target.checked)} />
                <span>Preferred default when generating from a booking</span>
              </label>
              <div className="admin-form-group admin-form-full">
                <label htmlFor="ag-new-body">Agreement body — placeholders</label>
                <p className="admin-ag-new-v2-placeholders">
                  <code>{PLACEHOLDER_HELP}</code>
                </p>
                <textarea
                  id="ag-new-body"
                  className="admin-ag-new-v2-textarea"
                  rows={20}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Paste or choose a starter…"
                  spellCheck={false}
                />
              </div>
            </div>
          </section>
        </div>

        <aside className="admin-ag-new-v2-preview-col">
          <div className="admin-card admin-ag-new-v2-preview-card">
            <h2 className="admin-ag-new-v2-h2">Live preview</h2>
            <p className="admin-ag-new-v2-muted">Sample data — same layout as download PDF.</p>
            <div className="admin-ag-new-v2-preview-inner">
              <AgreementLivePreview
                venueName={previewVars.venueName}
                venueTagline={venue.tagline}
                agreementTitle={name.trim() || "New template"}
                clientName={previewVars.client_name}
                clientEmail={previewVars.client_email}
                eventDate={previewVars.event_date}
                eventSlotLabel={previewVars.event_slot_label}
                bookingCode={previewVars.booking_code}
                totalGbp={previewVars.total_gbp}
                bodyText={mergedPreview}
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function NewAgreementTemplatePage() {
  return (
    <Suspense fallback={<div className="admin-crm-wide admin-lead" style={{ padding: "2rem" }}>Loading…</div>}>
      <NewAgreementTemplateInner />
    </Suspense>
  );
}
