"use client";

import { useState } from "react";
import Link from "next/link";
import { adminFetch, parseAdminError } from "@/lib/admin-api-client";
import { useAdminDialog } from "@/components/admin/AdminDialogContext";
import {
  HIRE_CONTRACT_SETTINGS_DEFAULTS,
  type HireContractIncludeItemTemplate,
  type HireContractPaymentMilestoneTemplate,
  type HireContractPriceRow,
  type HireContractSettingsPayload,
} from "@/lib/hire-contract-settings";

function SettingsTextarea({
  label,
  hint,
  value,
  onChange,
  rows = 4,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div className="admin-settings-v2-field admin-settings-v2-field--full">
      <label>{label}</label>
      {hint ? <p className="admin-settings-desc" style={{ marginTop: 0 }}>{hint}</p> : null}
      <textarea
        className="admin-settings-v2-input admin-settings-v2-textarea"
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function HireContractSettingsTab({
  initial,
  onSaved,
}: {
  initial: HireContractSettingsPayload;
  onSaved: (next: HireContractSettingsPayload) => void;
}) {
  const { alert } = useAdminDialog();
  const [form, setForm] = useState<HireContractSettingsPayload>(initial);
  const [saving, setSaving] = useState(false);
  const [openSection, setOpenSection] = useState<string>("sections");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await adminFetch("/api/admin/settings/hire-contract", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!r.ok) throw new Error(await parseAdminError(r, "Couldn’t save hire contract settings"));
      const data = (await r.json()) as HireContractSettingsPayload;
      setForm(data);
      onSaved(data);
      await alert("Hire contract defaults saved.");
    } catch (err) {
      await alert(err instanceof Error ? err.message : "Couldn’t save");
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = async () => {
    setForm(structuredClone(HIRE_CONTRACT_SETTINGS_DEFAULTS));
  };

  const updateIncludeItem = (index: number, patch: Partial<HireContractIncludeItemTemplate>) => {
    setForm((f) => ({
      ...f,
      includeItems: f.includeItems.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  };

  const addIncludeItem = () => {
    setForm((f) => ({
      ...f,
      includeItems: [
        ...f.includeItems,
        { id: `custom-${Date.now()}`, label: "New inclusion", enabledByDefault: true },
      ],
    }));
  };

  const removeIncludeItem = (index: number) => {
    setForm((f) => ({ ...f, includeItems: f.includeItems.filter((_, i) => i !== index) }));
  };

  const updatePriceRow = (
    key: "additionalOptions" | "additionalHours",
    index: number,
    patch: Partial<HireContractPriceRow>,
  ) => {
    setForm((f) => ({
      ...f,
      [key]: f[key].map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
  };

  const addPriceRow = (key: "additionalOptions" | "additionalHours") => {
    setForm((f) => ({ ...f, [key]: [...f[key], { label: "New item", price: "£0.00" }] }));
  };

  const updatePaymentTemplate = (index: number, patch: Partial<HireContractPaymentMilestoneTemplate>) => {
    setForm((f) => ({
      ...f,
      paymentSchedule: f.paymentSchedule.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
  };

  const addPaymentTemplate = () => {
    setForm((f) => ({
      ...f,
      paymentSchedule: [...f.paymentSchedule, { label: "Instalment", dueNote: "", percentOfContract: 0 }],
    }));
  };

  const removePaymentTemplate = (index: number) => {
    setForm((f) => ({ ...f, paymentSchedule: f.paymentSchedule.filter((_, i) => i !== index) }));
  };

  const updateTermsSection = (index: number, text: string) => {
    setForm((f) => ({
      ...f,
      termsSections: f.termsSections.map((s, i) => (i === index ? text : s)),
    }));
  };

  const addTermsSection = () => {
    setForm((f) => {
      const termsSections = [...f.termsSections];
      const insertAt = Math.max(0, termsSections.length - 1);
      termsSections.splice(insertAt, 0, "New section\n\nSection text…");
      return { ...f, termsSections };
    });
  };

  const removeTermsSection = (index: number) => {
    setForm((f) => {
      if (index <= 0 || index >= f.termsSections.length - 1) return f;
      return { ...f, termsSections: f.termsSections.filter((_, i) => i !== index) };
    });
  };

  const sections: { id: string; title: string; summary: string; body: React.ReactNode }[] = [
    {
      id: "sections",
      title: "PDF sections (defaults)",
      summary: "Which pages are included when you open Generate hire contract on a booking.",
      body: (
        <div className="admin-bkd-contract-checks">
          {(
            [
              ["includes", "Page 2 — INCLUDES"],
              ["table_linen_note", "Table linen note"],
              ["additional_options", "Page 3 — Additional options & hours"],
              ["payment_terms", "Page 4 — Payment terms & acceptance"],
              ["include_terms", "Append full Terms & Conditions"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="admin-pkg-slot-chip admin-hire-settings-chip">
              <input
                type="checkbox"
                checked={
                  key === "include_terms"
                    ? form.sectionDefaults.include_terms
                    : form.sectionDefaults[key]
                }
                onChange={() =>
                  setForm((f) => ({
                    ...f,
                    sectionDefaults: {
                      ...f.sectionDefaults,
                      [key]:
                        key === "include_terms"
                          ? !f.sectionDefaults.include_terms
                          : !f.sectionDefaults[key],
                    },
                  }))
                }
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      ),
    },
    {
      id: "intro",
      title: "Page 1 — Intro paragraph",
      summary: "Legal intro under the event details on the hire contract.",
      body: (
        <SettingsTextarea
          label="Intro text"
          hint="Use {{legalName}} where the venue name should appear."
          rows={6}
          value={form.introParagraph}
          onChange={(v) => setForm((f) => ({ ...f, introParagraph: v }))}
        />
      ),
    },
    {
      id: "includes",
      title: "Page 2 — What’s included",
      summary: "Bullet list on the INCLUDES page — edit wording and default on/off.",
      body: (
        <>
          <div className="admin-hire-settings-items">
            {form.includeItems.map((item, index) => (
              <div key={item.id} className="admin-hire-settings-item">
                <label className="admin-hire-settings-item-check">
                  <input
                    type="checkbox"
                    checked={item.enabledByDefault}
                    onChange={(e) => updateIncludeItem(index, { enabledByDefault: e.target.checked })}
                  />
                  <span>On by default</span>
                </label>
                <input
                  className="admin-settings-v2-input"
                  value={item.label}
                  onChange={(e) => updateIncludeItem(index, { label: e.target.value })}
                  placeholder="Inclusion text"
                />
                {item.subBullets ? (
                  <SettingsTextarea
                    label="Sub-bullets (one per line)"
                    rows={3}
                    value={item.subBullets.join("\n")}
                    onChange={(v) =>
                      updateIncludeItem(index, {
                        subBullets: v.split("\n").map((s) => s.trim()).filter(Boolean),
                      })
                    }
                  />
                ) : null}
                <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => removeIncludeItem(index)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={addIncludeItem}>
            + Add inclusion
          </button>
        </>
      ),
    },
    {
      id: "linen",
      title: "Table linen note",
      summary: "Paragraph under TABLE LINEN on page 2.",
      body: (
        <SettingsTextarea
          label="Table linen text"
          hint="Use {{legalName}} for the venue name."
          rows={5}
          value={form.tableLinenNote}
          onChange={(v) => setForm((f) => ({ ...f, tableLinenNote: v }))}
        />
      ),
    },
    {
      id: "options",
      title: "Page 3 — Additional options & hours",
      summary: "Price list and hourly rates on the options page.",
      body: (
        <>
          <h4 className="admin-section-title" style={{ fontSize: "0.95rem" }}>
            Additional options
          </h4>
          <div className="admin-hire-settings-price-grid">
            {form.additionalOptions.map((row, index) => (
              <div key={`opt-${index}`} className="admin-hire-settings-price-row">
                <input
                  className="admin-settings-v2-input"
                  value={row.label}
                  placeholder="Label"
                  onChange={(e) => updatePriceRow("additionalOptions", index, { label: e.target.value })}
                />
                <input
                  className="admin-settings-v2-input"
                  value={row.price}
                  placeholder="Price"
                  onChange={(e) => updatePriceRow("additionalOptions", index, { price: e.target.value })}
                />
              </div>
            ))}
          </div>
          <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => addPriceRow("additionalOptions")}>
            + Option row
          </button>
          <SettingsTextarea
            label="Additional hours intro"
            rows={2}
            value={form.additionalHoursIntro}
            onChange={(v) => setForm((f) => ({ ...f, additionalHoursIntro: v }))}
          />
          <h4 className="admin-section-title" style={{ fontSize: "0.95rem", marginTop: "1rem" }}>
            Additional hours
          </h4>
          <div className="admin-hire-settings-price-grid">
            {form.additionalHours.map((row, index) => (
              <div key={`hr-${index}`} className="admin-hire-settings-price-row">
                <input
                  className="admin-settings-v2-input"
                  value={row.label}
                  onChange={(e) => updatePriceRow("additionalHours", index, { label: e.target.value })}
                />
                <input
                  className="admin-settings-v2-input"
                  value={row.price}
                  onChange={(e) => updatePriceRow("additionalHours", index, { price: e.target.value })}
                />
              </div>
            ))}
          </div>
          <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => addPriceRow("additionalHours")}>
            + Hours row
          </button>
          <SettingsTextarea
            label="Alcohol & corkage note"
            hint="Use {{legalName}} for the venue name."
            rows={3}
            value={form.alcoholCorkageNote}
            onChange={(v) => setForm((f) => ({ ...f, alcoholCorkageNote: v }))}
          />
        </>
      ),
    },
    {
      id: "payments",
      title: "Page 4 — Payment schedule",
      summary: "Default instalments (4 × 25%) — amounts auto-calculate from the contract sum on each PDF.",
      body: (
        <>
          <p className="admin-settings-desc" style={{ marginTop: 0 }}>
            Set labels and due notes for each instalment. Use <strong>% of contract</strong> — the last row absorbs
            rounding. If a booking has milestones in the workspace, those override these defaults unless you edit the
            schedule on the contract panel.
          </p>
          <div className="admin-hire-settings-items">
            {form.paymentSchedule.map((row, index) => (
              <div key={`pay-${index}`} className="admin-hire-settings-item">
                <div className="admin-hire-settings-price-row admin-hire-settings-price-row--4">
                  <input
                    className="admin-settings-v2-input"
                    value={row.label}
                    placeholder="Label"
                    onChange={(e) => updatePaymentTemplate(index, { label: e.target.value })}
                  />
                  <input
                    className="admin-settings-v2-input"
                    type="number"
                    min={0}
                    max={100}
                    value={row.percentOfContract}
                    placeholder="%"
                    onChange={(e) =>
                      updatePaymentTemplate(index, { percentOfContract: Math.max(0, parseInt(e.target.value, 10) || 0) })
                    }
                  />
                  <input
                    className="admin-settings-v2-input"
                    value={row.dueNote}
                    placeholder="Due note"
                    onChange={(e) => updatePaymentTemplate(index, { dueNote: e.target.value })}
                  />
                  <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => removePaymentTemplate(index)}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={addPaymentTemplate}>
            + Instalment
          </button>
          <div className="admin-settings-v2-fields" style={{ marginTop: "1rem" }}>
            <div className="admin-settings-v2-field">
              <label>Refundable damage deposit (£)</label>
              <input
                className="admin-settings-v2-input"
                type="number"
                min={0}
                step={1}
                value={form.damageDepositPounds}
                onChange={(e) =>
                  setForm((f) => ({ ...f, damageDepositPounds: Math.max(0, parseFloat(e.target.value) || 0) }))
                }
              />
            </div>
          </div>
          <SettingsTextarea
            label="Damage deposit note"
            rows={2}
            value={form.damageDepositNote}
            onChange={(v) => setForm((f) => ({ ...f, damageDepositNote: v }))}
          />
          <SettingsTextarea
            label="Methods of payment"
            rows={2}
            value={form.paymentMethodsNote}
            onChange={(v) => setForm((f) => ({ ...f, paymentMethodsNote: v }))}
          />
        </>
      ),
    },
    {
      id: "terms",
      title: "Terms & Conditions appendix",
      summary: "Full legal text appended when “Append full Terms & Conditions” is enabled on a booking.",
      body: (
        <>
          <p className="admin-settings-desc" style={{ marginTop: 0 }}>
            Each block becomes one section in the PDF appendix. The first line is the heading; use blank lines between
            paragraphs. The last block is the acceptance / signature section — keep it last.
          </p>
          <div className="admin-bkd-contract-toolbar" style={{ marginBottom: "0.75rem" }}>
            <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={addTermsSection}>
              + Section
            </button>
          </div>
          <div className="admin-hire-settings-terms">
            {form.termsSections.map((section, index) => {
              const isFirst = index === 0;
              const isLast = index === form.termsSections.length - 1;
              const label = isFirst
                ? "Document title"
                : isLast
                  ? "Acceptance & signature"
                  : `Section ${index}`;
              return (
                <div key={index} className="admin-hire-settings-item">
                  <div className="admin-hire-settings-item-head">
                    <label>{label}</label>
                    {!isFirst && !isLast ? (
                      <button
                        type="button"
                        className="admin-btn admin-btn-ghost admin-btn-sm"
                        onClick={() => removeTermsSection(index)}
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                  <textarea
                    className="admin-settings-v2-input admin-settings-v2-textarea"
                    rows={isFirst ? 3 : isLast ? 8 : 6}
                    value={section}
                    onChange={(e) => updateTermsSection(index, e.target.value)}
                  />
                </div>
              );
            })}
          </div>
        </>
      ),
    },
  ];

  return (
    <section className="admin-card admin-settings-v2-card">
      <header className="admin-settings-v2-section-head">
        <p className="admin-settings-v2-kicker">Hire contract PDF</p>
        <h2 className="admin-card-heading">Venue hire contract defaults</h2>
        <p className="admin-settings-desc">
          Edit the standard hire pack text and which PDF pages are on by default. Staff can still override per booking on{" "}
          <Link href="/admin/bookings" className="admin-link">
            Bookings → Agreements
          </Link>
          . Business name and bank details come from{" "}
          <Link href="/admin/settings?tab=business" className="admin-link">
            Business &amp; bank
          </Link>
          .
        </p>
      </header>

      <form onSubmit={save} className="admin-hire-settings-form">
        <div className="admin-hire-settings-accordions">
          {sections.map((sec) => (
            <details
              key={sec.id}
              className="admin-hire-settings-accordion"
              open={openSection === sec.id}
              onToggle={(e) => {
                if ((e.target as HTMLDetailsElement).open) setOpenSection(sec.id);
              }}
            >
              <summary className="admin-hire-settings-accordion-summary">
                <span className="admin-hire-settings-accordion-title">{sec.title}</span>
                <span className="admin-hire-settings-accordion-desc">{sec.summary}</span>
              </summary>
              <div className="admin-hire-settings-accordion-body">{sec.body}</div>
            </details>
          ))}
        </div>

        <div className="admin-settings-v2-actions">
          <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Save hire contract defaults"}
          </button>
          <button type="button" className="admin-btn admin-btn-ghost" disabled={saving} onClick={resetDefaults}>
            Reset to factory defaults
          </button>
        </div>
      </form>
    </section>
  );
}
