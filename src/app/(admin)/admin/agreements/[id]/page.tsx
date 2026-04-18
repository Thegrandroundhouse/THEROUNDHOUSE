"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { adminFetch } from "@/lib/admin-api-client";
import { useAdminDialog } from "@/components/admin/AdminDialogContext";
import { mergeAgreementBody, AGREEMENT_EDITOR_PREVIEW_VARS } from "@/lib/agreement-merge";
import { AgreementLivePreview } from "@/components/admin/AgreementLivePreview";
import { AGREEMENT_SYSTEM_SLUGS, AGREEMENT_LOCKED_PLACEHOLDERS } from "@/lib/agreement-templates-constants";

type Seg = { k: "text" | "lock" | "tok"; v: string };

function bodyToSegments(body: string, system: boolean): Seg[] {
  const parts = body.split(/(\{\{[^}]+\}\})/g).filter((p) => p !== "");
  return parts.map((p) => {
    const isTok = /^\{\{[^}]+\}\}$/.test(p);
    if (!isTok) return { k: "text", v: p };
    if (system && AGREEMENT_LOCKED_PLACEHOLDERS.has(p)) return { k: "lock", v: p };
    return { k: "tok", v: p };
  });
}

function segmentsToBody(segs: Seg[]) {
  return segs.map((s) => s.v).join("");
}

type Template = {
  id: string;
  name: string;
  slug: string;
  body: string;
  is_preferred: boolean;
  is_system?: boolean;
  updated_at?: string;
};

export default function EditAgreementTemplatePage() {
  const { id } = useParams() as { id: string };
  const { alert, confirm } = useAdminDialog();
  const router = useRouter();
  const [t, setT] = useState<Template | null>(null);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [segs, setSegs] = useState<Seg[]>([]);
  const [preferred, setPreferred] = useState(false);
  const [saving, setSaving] = useState(false);
  const [venue, setVenue] = useState({ name: "", tagline: "" });

  const isSystem = !!(t && (t.is_system ?? AGREEMENT_SYSTEM_SLUGS.has(t.slug)));

  const load = useCallback(() => {
    adminFetch(`/api/admin/agreement-templates/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Template | null) => {
        if (d) {
          setT(d);
          setName(d.name);
          setBody(d.body);
          const sys = d.is_system ?? AGREEMENT_SYSTEM_SLUGS.has(d.slug);
          setSegs(bodyToSegments(d.body, sys));
          setPreferred(d.is_preferred);
        }
      });
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    adminFetch("/api/admin/settings/invoice-business")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { venueName?: string; venueTagline?: string } | null) => {
        setVenue({ name: d?.venueName || "", tagline: d?.venueTagline || "" });
      })
      .catch(() => setVenue({ name: "", tagline: "" }));
  }, []);

  const previewSource = useMemo(() => (isSystem ? segmentsToBody(segs) : body), [isSystem, segs, body]);

  const previewBody = useMemo(
    () =>
      mergeAgreementBody(previewSource, {
        ...AGREEMENT_EDITOR_PREVIEW_VARS,
        venueName: venue.name || AGREEMENT_EDITOR_PREVIEW_VARS.venueName,
      }),
    [previewSource, venue.name],
  );

  const updateSeg = (i: number, v: string) => {
    setSegs((prev) => prev.map((s, j) => (j === i ? { ...s, v } : s)));
  };

  const save = async () => {
    setSaving(true);
    try {
      const payloadBody = isSystem ? segmentsToBody(segs) : body;
      const r = await adminFetch(`/api/admin/agreement-templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, body: payloadBody, is_preferred: preferred }),
      });
      if (!r.ok) throw new Error((await r.json()).error || "Failed");
      await alert("Saved");
      load();
    } catch (e) {
      await alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    if (isSystem) {
      await alert("Library templates cannot be deleted. Use New template to copy and customize.");
      return;
    }
    if (!(await confirm("Delete this template? Booking copies stay linked.", { title: "Delete template", variant: "danger" }))) return;
    const r = await adminFetch(`/api/admin/agreement-templates/${id}`, { method: "DELETE" });
    if (!r.ok) await alert(await r.text());
    else router.push("/admin/agreements");
  };

  const updatedLabel = t?.updated_at
    ? new Date(t.updated_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })
    : null;

  if (!t) {
    return (
      <div className="admin-ag-edit-v2 admin-crm-wide">
        <div className="admin-ag-edit-v2-skel">
          <div className="admin-ag-edit-v2-skel-banner" />
          <div className="admin-ag-edit-v2-skel-cols">
            <div />
            <div />
          </div>
        </div>
        <p className="admin-lead" style={{ textAlign: "center", marginTop: "1rem" }}>
          Loading template…
        </p>
      </div>
    );
  }

  return (
    <div className="admin-ag-edit-v2 admin-crm-wide">
      <div className="admin-page-banner">
        <header className="admin-bk-hero admin-ag-edit-v2-hero">
          <div className="admin-bk-hero-text">
            <Link href="/admin/agreements" className="admin-ag-edit-v2-back">
              ← Agreements
            </Link>
            <p className="admin-dash-kicker">Template editor</p>
            <div className="admin-ag-edit-v2-hero-badges">
              {isSystem ? (
                <span className="admin-ag-edit-v2-badge admin-ag-edit-v2-badge--lib">Library</span>
              ) : (
                <span className="admin-ag-edit-v2-badge admin-ag-edit-v2-badge--custom">Custom</span>
              )}
              {preferred ? <span className="admin-ag-edit-v2-badge admin-ag-edit-v2-badge--pref">Preferred default</span> : null}
              <code className="admin-ag-edit-v2-slug">{t.slug}</code>
            </div>
            <h1 className="admin-page-title admin-bk-title">{name.trim() || "Untitled template"}</h1>
            <p className="admin-lead admin-bk-lead">
              {isSystem ? (
                <>
                  Core fields like <code>{"{{venueName}}"}</code> stay fixed; edit prose and other merge tags. Preview uses{" "}
                  <strong>sample data</strong> — PDFs from bookings use live figures.
                </>
              ) : (
                <>Full body editing. Live preview matches the printable PDF layout.</>
              )}
            </p>
            {updatedLabel ? <p className="admin-ag-edit-v2-updated">Last saved {updatedLabel}</p> : null}
          </div>
          <div className="admin-bk-hero-actions admin-ag-edit-v2-hero-actions">
            {!isSystem ? (
              <button type="button" className="admin-btn admin-btn-danger admin-btn-ghost" onClick={del}>
                Delete
              </button>
            ) : null}
            <Link href="/admin/agreements" className="admin-btn admin-btn-ghost">
              Back
            </Link>
            <button type="button" className="admin-btn admin-btn-primary" disabled={saving} onClick={save}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </header>
      </div>

      <div className="admin-ag-edit-v2-layout">
        <div className="admin-ag-edit-v2-main">
          <section className="admin-card admin-ag-edit-v2-card">
            <h2 className="admin-ag-edit-v2-h2">Details</h2>
            <div className="admin-ag-edit-v2-fields">
              <div className="admin-form-group">
                <label htmlFor="ag-edit-name">Display name</label>
                <input
                  id="ag-edit-name"
                  className="admin-ag-edit-v2-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Standard venue hire"
                />
              </div>
              <label className="admin-ag-edit-v2-check">
                <input type="checkbox" checked={preferred} onChange={(e) => setPreferred(e.target.checked)} />
                <span>Use as preferred default when generating from a booking</span>
              </label>
            </div>
          </section>

          <section className="admin-card admin-ag-edit-v2-card admin-ag-edit-v2-card--body">
            <h2 className="admin-ag-edit-v2-h2">Agreement body</h2>
            {isSystem ? (
              <div className="admin-agreement-seg-editor admin-ag-edit-v2-seg">
                <p className="admin-agreement-seg-hint">
                  Locked blocks are required merge fields. Edit paragraphs and other <code>{"{{...}}"}</code> tokens.
                </p>
                {segs.map((s, i) =>
                  s.k === "lock" ? (
                    <code key={`${i}-${s.v}`} className="admin-agreement-seg-lock" title="Locked merge field">
                      {s.v}
                    </code>
                  ) : s.k === "tok" ? (
                    <input
                      key={i}
                      className="admin-agreement-seg-tok"
                      value={s.v}
                      onChange={(e) => updateSeg(i, e.target.value)}
                      spellCheck={false}
                      aria-label="Merge field"
                    />
                  ) : (
                    <textarea
                      key={i}
                      className="admin-agreement-seg-text"
                      rows={Math.min(14, Math.max(2, s.v.split("\n").length + 1))}
                      value={s.v}
                      onChange={(e) => updateSeg(i, e.target.value)}
                      spellCheck={false}
                    />
                  ),
                )}
              </div>
            ) : (
              <>
                <p className="admin-ag-edit-v2-body-hint">
                  Placeholders: <code>{"{{client_name}}"}</code> <code>{"{{event_date}}"}</code>{" "}
                  <code>{"{{payment_schedule}}"}</code> …
                </p>
                <textarea
                  rows={24}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="admin-ag-edit-v2-textarea"
                  spellCheck={false}
                />
              </>
            )}
          </section>
        </div>

        <aside className="admin-ag-edit-v2-preview-wrap">
          <div className="admin-card admin-ag-edit-v2-preview-card">
            <h2 className="admin-ag-edit-v2-h2">Live preview</h2>
            <p className="admin-ag-edit-v2-preview-lead">PDF layout · sample merge data</p>
            <div className="admin-ag-edit-v2-preview-inner">
              <AgreementLivePreview
                venueName={venue.name || AGREEMENT_EDITOR_PREVIEW_VARS.venueName}
                venueTagline={venue.tagline}
                agreementTitle={name.trim() || "Agreement"}
                clientName={AGREEMENT_EDITOR_PREVIEW_VARS.client_name}
                clientEmail={AGREEMENT_EDITOR_PREVIEW_VARS.client_email}
                eventDate={AGREEMENT_EDITOR_PREVIEW_VARS.event_date}
                eventSlotLabel={AGREEMENT_EDITOR_PREVIEW_VARS.event_slot_label}
                bookingCode={AGREEMENT_EDITOR_PREVIEW_VARS.booking_code}
                totalGbp={AGREEMENT_EDITOR_PREVIEW_VARS.total_gbp}
                bodyText={previewBody}
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
