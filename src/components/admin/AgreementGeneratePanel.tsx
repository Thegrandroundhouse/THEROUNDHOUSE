"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { adminFetch, parseAdminError } from "@/lib/admin-api-client";
import { useAdminDialog } from "@/components/admin/AdminDialogContext";
import { AgreementPdfPreviewModal, useAgreementPdfPreview } from "@/components/admin/AgreementPdfPreviewModal";
import { calcLineItems, formatGbp, applyBusinessBankToContract, hasContractBankDetails, applyLineItemTotalsToContract, resolveContractPaymentSummary } from "@/lib/build-banqueting-contract";
import type { InvoiceBusinessPayload } from "@/app/api/admin/settings/invoice-business/route";
import { BANQUETING_HIRE_TEMPLATE_LABEL, BANQUETING_TERMS_TEMPLATE_LABEL } from "@/lib/venue-constants";
import {
  BANQUETING_HIRE_SLUG,
  BANQUETING_TERMS_SLUG,
  DEFAULT_INCLUDE_BULLETS,
  type ContractLineItem,
  type RoundhouseContractData,
  type RoundhouseIncludeBullets,
} from "@/lib/roundhouse-contract-types";
import {
  applyLegalNameTemplate,
  buildPaymentScheduleFromTemplate,
  type HireContractSettingsPayload,
} from "@/lib/hire-contract-settings";
import type { RoundhousePaymentMilestone } from "@/lib/roundhouse-contract-types";

type Template = { id: string; name: string; slug: string; is_preferred: boolean };

type PriceRow = { label: string; price: string };

function PdfSectionAccordion({
  enabled,
  onToggle,
  title,
  desc,
  defaultOpen = false,
  children,
}: {
  enabled: boolean;
  onToggle: () => void;
  title: string;
  desc: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      className={`admin-hire-settings-accordion ${enabled ? "admin-hire-settings-accordion--on" : "admin-hire-settings-accordion--off"}`}
      open={defaultOpen || enabled}
    >
      <summary className="admin-hire-settings-accordion-summary">
        <label className="admin-hire-section-toggle" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          <input type="checkbox" checked={enabled} onChange={onToggle} aria-label={`Include ${title}`} />
          <span className="admin-hire-settings-accordion-title">{title}</span>
        </label>
        <span className="admin-hire-settings-accordion-desc">{desc}</span>
      </summary>
      <div className="admin-hire-settings-accordion-body">{children}</div>
    </details>
  );
}

function poundsToCents(s: string): number {
  const n = parseFloat(s.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function centsToPounds(c: number): string {
  return (c / 100).toFixed(2);
}

export function AgreementGeneratePanel({
  bookingId,
  templates,
  onGenerated,
  editContract,
  onEditConsumed,
}: {
  bookingId: string;
  templates: Template[];
  onGenerated: (row: Record<string, unknown>) => void;
  /** Load an existing hire contract back into the editor (creates a new PDF on generate). */
  editContract?: RoundhouseContractData | null;
  onEditConsumed?: () => void;
}) {
  const { alert } = useAdminDialog();
  const pdfPreview = useAgreementPdfPreview();
  const [templateId, setTemplateId] = useState("");
  const [draft, setDraft] = useState<RoundhouseContractData | null>(null);
  const [loading, setLoading] = useState(true);
  const [draftLoadError, setDraftLoadError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [settingsBusiness, setSettingsBusiness] = useState<InvoiceBusinessPayload | null>(null);
  const balanceManualRef = useRef(false);

  const selectedTemplate = templates.find((t) => t.id === templateId);
  const isHireContract = selectedTemplate?.slug === BANQUETING_HIRE_SLUG;
  const isTermsPdf = selectedTemplate?.slug === BANQUETING_TERMS_SLUG;
  const isStructuredPdf = isHireContract || isTermsPdf;

  const loadDraft = useCallback(() => {
    setLoading(true);
    setDraftLoadError(null);
    adminFetch(`/api/admin/bookings/${bookingId}/contract-draft`)
      .then(async (r) => {
        if (!r.ok) throw new Error(await parseAdminError(r, "Couldn’t load contract draft"));
        return r.json();
      })
      .then((d: { draft?: RoundhouseContractData }) => {
        if (d?.draft) setDraft(applyLineItemTotalsToContract(d.draft));
      })
      .catch((err) => {
        setDraft(null);
        setDraftLoadError(err instanceof Error ? err.message : "Couldn’t load contract draft");
      })
      .finally(() => setLoading(false));
  }, [bookingId]);

  useEffect(() => {
    loadDraft();
  }, [loadDraft]);

  useEffect(() => {
    adminFetch("/api/admin/settings/invoice-business")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: InvoiceBusinessPayload | null) => setSettingsBusiness(d))
      .catch(() => setSettingsBusiness(null));
  }, []);

  useEffect(() => {
    if (!templateId && templates.length) {
      const pref =
        templates.find((t) => t.slug === BANQUETING_HIRE_SLUG) ||
        templates.find((t) => t.is_preferred) ||
        templates[0];
      if (pref) setTemplateId(pref.id);
    }
  }, [templates, templateId]);

  useEffect(() => {
    if (!editContract) return;
    setDraft(applyLineItemTotalsToContract(editContract));
    setExpanded(true);
    const hireTpl = templates.find((t) => t.slug === BANQUETING_HIRE_SLUG);
    if (hireTpl) setTemplateId(hireTpl.id);
    onEditConsumed?.();
  }, [editContract, templates, onEditConsumed]);

  const totals = useMemo(() => {
    if (!draft) return { subtotalCents: 0, discountTotalCents: 0, contractSumCents: 0 };
    return calcLineItems(draft.lineItems);
  }, [draft?.lineItems]);

  const paymentSummary = useMemo(() => {
    if (!draft) return { paidCents: 0, balanceDueCents: 0 };
    return resolveContractPaymentSummary({ ...draft, ...totals });
  }, [draft, totals]);

  const updatePaidCents = (cents: number) => {
    setDraft((d) => {
      if (!d) return d;
      const paidCents = Math.max(0, cents);
      const balanceDueCents = balanceManualRef.current
        ? Math.max(0, d.balanceDueCents ?? totals.contractSumCents - paidCents)
        : Math.max(0, totals.contractSumCents - paidCents);
      return { ...d, paidCents, balanceDueCents };
    });
  };

  const updateBalanceDueCents = (cents: number) => {
    balanceManualRef.current = true;
    setDraft((d) => (d ? { ...d, balanceDueCents: Math.max(0, cents) } : d));
  };

  const syncBalanceFromPaid = () => {
    balanceManualRef.current = false;
    setDraft((d) =>
      d ? { ...d, balanceDueCents: Math.max(0, totals.contractSumCents - (d.paidCents ?? 0)) } : d,
    );
  };

  const pullPaidFromBooking = async () => {
    try {
      const r = await adminFetch(`/api/admin/payments/booking/${bookingId}`);
      if (!r.ok) throw new Error(await parseAdminError(r, "Couldn’t load payments"));
      const d = (await r.json()) as { totals?: { customer_received?: number } };
      const paid = d.totals?.customer_received ?? 0;
      balanceManualRef.current = false;
      setDraft((prev) =>
        prev
          ? {
              ...prev,
              paidCents: paid,
              balanceDueCents: Math.max(0, totals.contractSumCents - paid),
            }
          : prev,
      );
    } catch (e) {
      await alert(e instanceof Error ? e.message : "Couldn’t load payments");
    }
  };

  const updateLine = (id: string, patch: Partial<ContractLineItem>) => {
    setDraft((d) => {
      if (!d) return d;
      const lineItems = d.lineItems.map((r) => (r.id === id ? { ...r, ...patch } : r));
      return applyLineItemTotalsToContract({ ...d, lineItems });
    });
  };

  const addLine = () => {
    setDraft((d) => {
      if (!d) return d;
      return applyLineItemTotalsToContract({
        ...d,
        lineItems: [
          ...d.lineItems,
          {
            id: `custom-${Date.now()}`,
            description: "Additional item",
            qty: 1,
            unitCostCents: 0,
            discountCents: 0,
            included: true,
          },
        ],
      });
    });
  };

  const toggleIncludeItem = (id: string) => {
    setDraft((d) => {
      if (!d?.includeItems?.length) {
        return d
          ? {
              ...d,
              includeBullets: {
                ...d.includeBullets,
                [id as keyof RoundhouseIncludeBullets]: !d.includeBullets[id as keyof RoundhouseIncludeBullets],
              },
            }
          : d;
      }
      return {
        ...d,
        includeItems: d.includeItems.map((item) =>
          item.id === id ? { ...item, included: !item.included } : item,
        ),
        includeBullets: {
          ...d.includeBullets,
          [id as keyof RoundhouseIncludeBullets]: !d.includeBullets[id as keyof RoundhouseIncludeBullets],
        },
      };
    });
  };

  const updateIncludeItemLabel = (id: string, label: string) => {
    setDraft((d) =>
      d?.includeItems?.length
        ? { ...d, includeItems: d.includeItems.map((item) => (item.id === id ? { ...item, label } : item)) }
        : d,
    );
  };

  const updateIncludeItemSubBullets = (id: string, text: string) => {
    const subBullets = text.split("\n").map((s) => s.trim()).filter(Boolean);
    setDraft((d) =>
      d?.includeItems?.length
        ? {
            ...d,
            includeItems: d.includeItems.map((item) =>
              item.id === id ? { ...item, subBullets: subBullets.length ? subBullets : undefined } : item,
            ),
          }
        : d,
    );
  };

  const updatePriceRow = (key: "additionalOptions" | "additionalHours", index: number, patch: Partial<PriceRow>) => {
    setDraft((d) => {
      if (!d) return d;
      const rows = [...(d[key] || [])];
      rows[index] = { ...rows[index], ...patch };
      return { ...d, [key]: rows };
    });
  };

  const addPriceRow = (key: "additionalOptions" | "additionalHours") => {
    setDraft((d) =>
      d ? { ...d, [key]: [...(d[key] || []), { label: "New item", price: "£0.00" }] } : d,
    );
  };

  const removePriceRow = (key: "additionalOptions" | "additionalHours", index: number) => {
    setDraft((d) => {
      if (!d?.[key]?.length) return d;
      return { ...d, [key]: d[key]!.filter((_, i) => i !== index) };
    });
  };

  const refreshContentFromSettings = async () => {
    if (!draft) return;
    const r = await adminFetch("/api/admin/settings/hire-contract");
    if (!r.ok) {
      await alert(await parseAdminError(r, "Couldn’t load contract defaults from Settings"));
      return;
    }
    const settings = (await r.json()) as HireContractSettingsPayload;
    const legalName = draft.company.legalName;
    setDraft({
      ...draft,
      include_terms: settings.sectionDefaults.include_terms,
      sections: {
        includes: settings.sectionDefaults.includes,
        table_linen_note: settings.sectionDefaults.table_linen_note,
        additional_options: settings.sectionDefaults.additional_options,
        payment_terms: settings.sectionDefaults.payment_terms,
      },
      introParagraph: applyLegalNameTemplate(settings.introParagraph, legalName),
      tableLinenNote: applyLegalNameTemplate(settings.tableLinenNote, legalName),
      additionalOptions: settings.additionalOptions.map((row) => ({ ...row })),
      additionalHoursIntro: settings.additionalHoursIntro,
      additionalHours: settings.additionalHours.map((row) => ({ ...row })),
      alcoholCorkageNote: applyLegalNameTemplate(settings.alcoholCorkageNote, legalName),
      includeItems: settings.includeItems.map((item) => ({
        id: item.id,
        label: item.label,
        included: item.enabledByDefault,
        subBullets: item.subBullets?.length ? [...item.subBullets] : undefined,
      })),
      includeBullets: settings.includeItems.reduce(
        (acc, item) => {
          if (item.id in DEFAULT_INCLUDE_BULLETS) {
            acc[item.id as keyof RoundhouseIncludeBullets] = item.enabledByDefault;
          }
          return acc;
        },
        { ...draft.includeBullets },
      ),
      paymentTerms: {
        ...draft.paymentTerms,
        schedule: buildPaymentScheduleFromTemplate(totals.contractSumCents, settings.paymentSchedule),
        damageDepositCents: Math.round(settings.damageDepositPounds * 100),
        damageDepositNote: settings.damageDepositNote,
        paymentMethodsNote: settings.paymentMethodsNote,
      },
      termsSections: settings.termsSections.map((s) => applyLegalNameTemplate(s, legalName)),
    });
  };

  const recalcPaymentSchedule = async () => {
    if (!draft) return;
    const r = await adminFetch("/api/admin/settings/hire-contract");
    if (!r.ok) {
      await alert(await parseAdminError(r, "Couldn’t load payment defaults"));
      return;
    }
    const settings = (await r.json()) as HireContractSettingsPayload;
    setDraft({
      ...draft,
      paymentTerms: {
        ...draft.paymentTerms,
        schedule: buildPaymentScheduleFromTemplate(totals.contractSumCents, settings.paymentSchedule),
        damageDepositCents: Math.round(settings.damageDepositPounds * 100),
        damageDepositNote: settings.damageDepositNote,
        paymentMethodsNote: settings.paymentMethodsNote,
      },
    });
  };

  const resetTermsFromSettings = async () => {
    if (!draft) return;
    const r = await adminFetch("/api/admin/settings/hire-contract");
    if (!r.ok) {
      await alert(await parseAdminError(r, "Couldn’t load T&C defaults from Settings"));
      return;
    }
    const settings = (await r.json()) as HireContractSettingsPayload;
    setDraft({
      ...draft,
      termsSections: settings.termsSections.map((s) => applyLegalNameTemplate(s, draft.company.legalName)),
    });
  };

  const updateTermsSection = (index: number, text: string) => {
    setDraft((d) => {
      if (!d) return d;
      const termsSections = [...(d.termsSections ?? [])];
      termsSections[index] = text;
      return { ...d, termsSections };
    });
  };

  const addTermsSection = () => {
    setDraft((d) => {
      if (!d) return d;
      const termsSections = [...(d.termsSections ?? [])];
      const insertAt = Math.max(0, termsSections.length - 1);
      termsSections.splice(insertAt, 0, "New section\n\nSection text…");
      return { ...d, termsSections };
    });
  };

  const removeTermsSection = (index: number) => {
    setDraft((d) => {
      if (!d?.termsSections?.length || index <= 0 || index >= d.termsSections.length - 1) return d;
      return { ...d, termsSections: d.termsSections.filter((_, i) => i !== index) };
    });
  };

  const updateScheduleRow = (index: number, patch: Partial<RoundhousePaymentMilestone>) => {
    setDraft((d) => {
      if (!d) return d;
      const schedule = [...d.paymentTerms.schedule];
      schedule[index] = { ...schedule[index], ...patch };
      return { ...d, paymentTerms: { ...d.paymentTerms, schedule } };
    });
  };

  const addScheduleRow = () => {
    setDraft((d) =>
      d
        ? {
            ...d,
            paymentTerms: {
              ...d.paymentTerms,
              schedule: [...d.paymentTerms.schedule, { label: "Instalment", amountCents: 0, dueNote: "" }],
            },
          }
        : d,
    );
  };

  const removeScheduleRow = (index: number) => {
    setDraft((d) => {
      if (!d || d.paymentTerms.schedule.length <= 1) return d;
      return {
        ...d,
        paymentTerms: {
          ...d.paymentTerms,
          schedule: d.paymentTerms.schedule.filter((_, i) => i !== index),
        },
      };
    });
  };

  const updatePaymentTermsPatch = (patch: Partial<RoundhouseContractData["paymentTerms"]>) => {
    setDraft((d) => (d ? { ...d, paymentTerms: { ...d.paymentTerms, ...patch } } : d));
  };

  const updatePaymentTerm = (field: keyof RoundhouseContractData["paymentTerms"], value: string) => {
    setDraft((d) =>
      d
        ? {
            ...d,
            paymentTerms: { ...d.paymentTerms, [field]: value },
          }
        : d,
    );
  };

  const refreshBankFromSettings = async () => {
    if (!draft) return;
    let business = settingsBusiness;
    if (!business) {
      const r = await adminFetch("/api/admin/settings/invoice-business");
      if (r.ok) {
        business = await r.json();
        setSettingsBusiness(business);
      }
    }
    if (!business?.bankName?.trim() && !business?.sortCode?.trim() && !business?.accountNumber?.trim()) {
      await alert("No bank details in Settings yet — open Settings → Business & bank and save your sort code and account number first.");
      return;
    }
    setDraft(applyBusinessBankToContract(draft, business));
  };

  const bankConfigured = draft ? hasContractBankDetails(draft.paymentTerms) : false;

  const previewPdf = async () => {
    if (!templateId) {
      await alert("Choose a template");
      return;
    }
    const title = selectedTemplate?.name || "Agreement";
    pdfPreview.startLoading(title);
    try {
      const payload: Record<string, unknown> = { template_id: templateId };
      if (isHireContract && draft) {
        payload.contract = applyLineItemTotalsToContract({ ...draft, ...totals });
      }
      const r = await adminFetch(`/api/admin/bookings/${bookingId}/agreements/preview-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        pdfPreview.showError(typeof d.error === "string" ? d.error : "Preview failed");
        return;
      }
      const blob = await r.blob();
      const safeName = title.replace(/[^a-z0-9-_]/gi, "-").slice(0, 48) || "agreement";
      pdfPreview.showBlob(blob, title, () => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${safeName}-preview.pdf`;
        a.click();
        URL.revokeObjectURL(a.href);
      });
    } catch {
      pdfPreview.showError("Preview failed");
    }
  };

  const generate = async () => {
    if (!templateId) {
      await alert("Choose a template");
      return;
    }
    setGenerating(true);
    try {
      const payload: Record<string, unknown> = { template_id: templateId };
      if (isHireContract && draft) {
        payload.contract = applyLineItemTotalsToContract({ ...draft, ...totals });
      }
      const r = await adminFetch(`/api/admin/bookings/${bookingId}/agreements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(await parseAdminError(r, "Couldn’t generate agreement"));
      const d = await r.json();
      onGenerated(d);
    } catch (e) {
      await alert(e instanceof Error ? e.message : "Failed to generate");
    } finally {
      setGenerating(false);
    }
  };

  if (loading && !draft) {
    return draftLoadError ? (
      <div className="admin-pay-banner" style={{ background: "#fee2e2", borderColor: "#ef4444" }} role="alert">
        {draftLoadError}
        <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" style={{ marginLeft: "0.75rem" }} onClick={loadDraft}>
          Retry
        </button>
      </div>
    ) : (
      <p className="admin-vnd-new-hint">Loading contract draft from booking…</p>
    );
  }

  return (
    <>
    <div className="admin-bkd-contract-gen">
      <div className="admin-bkd-contract-gen-head">
        <select
          className="admin-bk-search"
          value={templateId}
          onChange={(e) => {
            setTemplateId(e.target.value);
            setExpanded(false);
          }}
          aria-label="Agreement template"
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
              {t.is_preferred ? " ★" : ""}
            </option>
          ))}
        </select>
        <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setExpanded((x) => !x)}>
          {expanded ? "Hide options" : isHireContract ? "Configure hire contract" : isTermsPdf ? "Preview details" : "Options"}
        </button>
        <button type="button" className="admin-btn admin-btn-secondary admin-btn-sm" disabled={!templateId} onClick={previewPdf}>
          Preview PDF
        </button>
        <button type="button" className="admin-btn admin-btn-primary admin-btn-sm" disabled={generating} onClick={generate}>
          {generating
            ? "Generating…"
            : isHireContract
              ? "Generate hire PDF"
              : isTermsPdf
                ? "Generate T&C PDF"
                : "Generate agreement"}
        </button>
      </div>

      {isHireContract && draft ? (
        <div className="admin-bkd-contract-pay-strip">
          <div className="admin-bkd-contract-pay-strip-head">
            <h3 className="admin-bkd-contract-pay-strip-title">Payment on page 1</h3>
            <p className="admin-vnd-new-hint">
              Set what prints on the first page before you preview or generate the PDF.
            </p>
          </div>
          <div className="admin-bkd-contract-pay-strip-grid">
            <div className="admin-bkd-contract-pay-field">
              <span className="admin-bkd-contract-pay-label">Contract total</span>
              <strong className="admin-bkd-contract-pay-readout">{formatGbp(totals.contractSumCents)}</strong>
            </div>
            <label className="admin-bkd-contract-pay-field">
              <span className="admin-bkd-contract-pay-label">Amount paid £</span>
              <input
                className="admin-table-inline-input"
                value={centsToPounds(draft.paidCents ?? paymentSummary.paidCents)}
                onChange={(e) => updatePaidCents(poundsToCents(e.target.value))}
              />
            </label>
            <label className="admin-bkd-contract-pay-field">
              <span className="admin-bkd-contract-pay-label">Balance due £</span>
              <input
                className="admin-table-inline-input"
                value={centsToPounds(draft.balanceDueCents ?? paymentSummary.balanceDueCents)}
                onChange={(e) => updateBalanceDueCents(poundsToCents(e.target.value))}
              />
            </label>
          </div>
          <div className="admin-bkd-contract-pay-strip-actions">
            <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={pullPaidFromBooking}>
              Pull paid from booking
            </button>
            <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={syncBalanceFromPaid}>
              Balance = total − paid
            </button>
            <label className="admin-bkd-contract-pay-print">
              <input
                type="checkbox"
                checked={draft.showPaymentSummaryOnCover !== false}
                onChange={(e) =>
                  setDraft((d) => (d ? { ...d, showPaymentSummaryOnCover: e.target.checked } : d))
                }
              />
              Print on page 1
            </label>
          </div>
        </div>
      ) : null}

      {isTermsPdf && expanded ? (
        <div className="admin-bkd-contract-gen-body">
          <p className="admin-vnd-new-hint" style={{ marginBottom: "0.75rem" }}>
            Official <strong>Terms &amp; Conditions</strong> PDF (~6 pages) with company header on each page. Client name
            and event date are taken from this booking. Venue details from{" "}
            <Link href="/admin/settings" className="admin-link">
              Settings → Business
            </Link>
            .
          </p>
          {draft ? (
            <dl className="admin-bko-dl" style={{ maxWidth: "28rem" }}>
              <div>
                <dt>Client</dt>
                <dd>{draft.client.name || "—"}</dd>
              </div>
              <div>
                <dt>Event date</dt>
                <dd>{draft.event.dateLabel || "—"}</dd>
              </div>
              <div>
                <dt>Reference</dt>
                <dd>{draft.enquiry.enquiryRef || "—"}</dd>
              </div>
            </dl>
          ) : null}
        </div>
      ) : null}

      {isHireContract && draft && expanded ? (
        <div className="admin-bkd-contract-gen-body">
          <div className="admin-bkd-contract-gen-toolbar">
            <p className="admin-vnd-new-hint" style={{ margin: 0, flex: 1 }}>
              Defaults come from{" "}
              <Link href="/admin/settings?tab=contract" className="admin-link">
                Settings → Hire contract
              </Link>
              . Expand each section to edit this booking’s PDF — uncheck pages or inclusions you don’t need.
            </p>
            <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={refreshContentFromSettings}>
              Reset text from Settings
            </button>
          </div>

          <div className="admin-form-grid" style={{ marginBottom: "1rem" }}>
            <div className="admin-form-group">
              <label>Client name</label>
              <input
                value={draft.client.name}
                onChange={(e) => setDraft((d) => (d ? { ...d, client: { ...d.client, name: e.target.value } } : d))}
              />
            </div>
            <div className="admin-form-group">
              <label>Phone</label>
              <input
                value={draft.client.phone}
                onChange={(e) => setDraft((d) => (d ? { ...d, client: { ...d.client, phone: e.target.value } } : d))}
              />
            </div>
            <div className="admin-form-group admin-form-full">
              <label>Address</label>
              <input
                value={draft.client.address}
                onChange={(e) => setDraft((d) => (d ? { ...d, client: { ...d.client, address: e.target.value } } : d))}
                placeholder="Client address for the contract"
              />
            </div>
            <div className="admin-form-group">
              <label>Sales representative</label>
              <input
                value={draft.enquiry.salesRep === "—" ? "" : draft.enquiry.salesRep}
                onChange={(e) =>
                  setDraft((d) => (d ? { ...d, enquiry: { ...d.enquiry, salesRep: e.target.value || "—" } } : d))
                }
                placeholder="Name on the contract PDF"
              />
            </div>
            <div className="admin-form-group">
              <label>Suite / room</label>
              <input
                value={draft.event.suites}
                onChange={(e) => setDraft((d) => (d ? { ...d, event: { ...d.event, suites: e.target.value } } : d))}
              />
            </div>
            <div className="admin-form-group">
              <label>Guests</label>
              <input
                value={draft.event.guestCount}
                onChange={(e) => setDraft((d) => (d ? { ...d, event: { ...d.event, guestCount: e.target.value } } : d))}
              />
            </div>
            <div className="admin-form-group">
              <label>Exclusivity</label>
              <select
                value={draft.event.exclusivity}
                onChange={(e) =>
                  setDraft((d) =>
                    d ? { ...d, event: { ...d.event, exclusivity: e.target.value as "Exclusive" | "Non Exclusive" } } : d,
                  )
                }
              >
                <option value="Non Exclusive">Non Exclusive</option>
                <option value="Exclusive">Exclusive</option>
              </select>
            </div>
            <div className="admin-form-group">
              <label>Access from</label>
              <input
                value={draft.event.accessFrom}
                onChange={(e) => setDraft((d) => (d ? { ...d, event: { ...d.event, accessFrom: e.target.value } } : d))}
              />
            </div>
            <div className="admin-form-group">
              <label>Start time</label>
              <input
                value={draft.event.startTime}
                onChange={(e) => setDraft((d) => (d ? { ...d, event: { ...d.event, startTime: e.target.value } } : d))}
              />
            </div>
            <div className="admin-form-group">
              <label>End time</label>
              <input
                value={draft.event.endTime}
                onChange={(e) => setDraft((d) => (d ? { ...d, event: { ...d.event, endTime: e.target.value } } : d))}
              />
            </div>
          </div>

          <h4 className="admin-section-title" style={{ fontSize: "0.95rem" }}>
            Line items &amp; contract sum
          </h4>
          <div className="admin-pay-table-wrap" style={{ marginBottom: "0.75rem" }}>
            <table className="admin-pay-table admin-bkd-contract-lines">
              <thead>
                <tr>
                  <th>Include</th>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Unit £</th>
                  <th>Discount £</th>
                  <th>Line total</th>
                </tr>
              </thead>
              <tbody>
                {draft.lineItems.map((row) => {
                  const lineTotal = row.included ? row.qty * row.unitCostCents - row.discountCents : 0;
                  return (
                    <tr key={row.id}>
                      <td>
                        <input type="checkbox" checked={row.included} onChange={(e) => updateLine(row.id, { included: e.target.checked })} />
                      </td>
                      <td>
                        <input
                          className="admin-table-inline-input"
                          value={row.description}
                          onChange={(e) => updateLine(row.id, { description: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={1}
                          className="admin-table-inline-input"
                          style={{ width: "3.5rem" }}
                          value={row.qty}
                          onChange={(e) => updateLine(row.id, { qty: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                        />
                      </td>
                      <td>
                        <input
                          className="admin-table-inline-input"
                          style={{ width: "5.5rem" }}
                          value={centsToPounds(row.unitCostCents)}
                          onChange={(e) => updateLine(row.id, { unitCostCents: poundsToCents(e.target.value) })}
                        />
                      </td>
                      <td>
                        <input
                          className="admin-table-inline-input"
                          style={{ width: "5.5rem" }}
                          value={centsToPounds(row.discountCents)}
                          onChange={(e) => updateLine(row.id, { discountCents: poundsToCents(e.target.value) })}
                        />
                      </td>
                      <td>{formatGbp(lineTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={addLine}>
            + Line item
          </button>
          <p style={{ marginTop: "0.75rem", fontWeight: 700 }}>
            Contract sum: {formatGbp(totals.contractSumCents)}
            {totals.discountTotalCents > 0 ? (
              <span style={{ fontWeight: 400, color: "var(--color-text-muted)", marginLeft: "0.5rem" }}>
                (discounts −{formatGbp(totals.discountTotalCents)})
              </span>
            ) : null}
          </p>

          <div className="admin-hire-settings-accordions admin-bkd-contract-accordions">
            <details className="admin-hire-settings-accordion" open>
              <summary className="admin-hire-settings-accordion-summary">
                <span className="admin-hire-settings-accordion-title">Page 1 — Intro paragraph</span>
                <span className="admin-hire-settings-accordion-desc">Always on page 1 — legal intro under event details.</span>
              </summary>
              <div className="admin-hire-settings-accordion-body">
                <textarea
                  className="admin-settings-v2-input admin-settings-v2-textarea"
                  rows={5}
                  value={draft.introParagraph}
                  onChange={(e) => setDraft((d) => (d ? { ...d, introParagraph: e.target.value } : d))}
                />
              </div>
            </details>

            <PdfSectionAccordion
              enabled={draft.sections.includes}
              onToggle={() => setDraft((d) => (d ? { ...d, sections: { ...d.sections, includes: !d.sections.includes } } : d))}
              title="Page 2 — INCLUDES"
              desc="What's included in the hire — tick each line and edit wording."
              defaultOpen
            >
              <div className="admin-hire-settings-items">
                {(draft.includeItems?.length
                  ? draft.includeItems
                  : (Object.keys(DEFAULT_INCLUDE_BULLETS) as (keyof RoundhouseIncludeBullets)[]).map((id) => ({
                      id,
                      label: id.replace(/_/g, " "),
                      included: draft.includeBullets[id],
                    }))
                ).map((item) => (
                  <div key={item.id} className="admin-hire-settings-item">
                    <div className="admin-hire-settings-item--inline">
                      <label className="admin-hire-settings-item-check">
                        <input type="checkbox" checked={item.included} onChange={() => toggleIncludeItem(item.id)} />
                        <span>Include</span>
                      </label>
                      <input
                        className="admin-settings-v2-input"
                        value={item.label}
                        onChange={(e) => updateIncludeItemLabel(item.id, e.target.value)}
                      />
                    </div>
                    {"subBullets" in item && item.subBullets?.length ? (
                      <textarea
                        className="admin-settings-v2-input admin-settings-v2-textarea"
                        rows={3}
                        value={item.subBullets.join("\n")}
                        onChange={(e) => updateIncludeItemSubBullets(item.id, e.target.value)}
                        placeholder="Sub-bullets (one per line)"
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            </PdfSectionAccordion>

            <PdfSectionAccordion
              enabled={draft.sections.table_linen_note}
              onToggle={() =>
                setDraft((d) => (d ? { ...d, sections: { ...d.sections, table_linen_note: !d.sections.table_linen_note } } : d))
              }
              title="Table linen note"
              desc="Paragraph under TABLE LINEN on page 2."
            >
              <textarea
                className="admin-settings-v2-input admin-settings-v2-textarea"
                rows={4}
                value={draft.tableLinenNote || ""}
                onChange={(e) => setDraft((d) => (d ? { ...d, tableLinenNote: e.target.value } : d))}
              />
            </PdfSectionAccordion>

            <PdfSectionAccordion
              enabled={draft.sections.additional_options}
              onToggle={() =>
                setDraft((d) =>
                  d ? { ...d, sections: { ...d.sections, additional_options: !d.sections.additional_options } } : d,
                )
              }
              title="Page 3 — Additional options & hours"
              desc="Price lists, hourly rates, and alcohol note."
            >
              <h5 className="admin-section-title" style={{ fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                Additional options
              </h5>
              <div className="admin-hire-settings-price-grid">
                {(draft.additionalOptions || []).map((row, index) => (
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
                    <button
                      type="button"
                      className="admin-btn admin-btn-ghost admin-btn-sm"
                      onClick={() => removePriceRow("additionalOptions", index)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => addPriceRow("additionalOptions")}>
                + Option row
              </button>
              <textarea
                className="admin-settings-v2-input admin-settings-v2-textarea"
                rows={2}
                style={{ marginTop: "0.75rem" }}
                value={draft.additionalHoursIntro || ""}
                onChange={(e) => setDraft((d) => (d ? { ...d, additionalHoursIntro: e.target.value } : d))}
                placeholder="Additional hours intro"
              />
              <h5 className="admin-section-title" style={{ fontSize: "0.85rem", margin: "1rem 0 0.5rem" }}>
                Additional hours
              </h5>
              <div className="admin-hire-settings-price-grid">
                {(draft.additionalHours || []).map((row, index) => (
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
                    <button
                      type="button"
                      className="admin-btn admin-btn-ghost admin-btn-sm"
                      onClick={() => removePriceRow("additionalHours", index)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => addPriceRow("additionalHours")}>
                + Hours row
              </button>
              <textarea
                className="admin-settings-v2-input admin-settings-v2-textarea"
                rows={3}
                style={{ marginTop: "0.75rem" }}
                value={draft.alcoholCorkageNote || ""}
                onChange={(e) => setDraft((d) => (d ? { ...d, alcoholCorkageNote: e.target.value } : d))}
                placeholder="Alcohol & corkage note"
              />
            </PdfSectionAccordion>

            <PdfSectionAccordion
              enabled={draft.sections.payment_terms}
              onToggle={() =>
                setDraft((d) => (d ? { ...d, sections: { ...d.sections, payment_terms: !d.sections.payment_terms } } : d))
              }
              title="Page 4 — Payment terms & acceptance"
              desc="Instalment schedule, damage deposit, bank details, and acceptance."
            >
              <div className="admin-bkd-contract-bank-head" style={{ marginBottom: "0.75rem" }}>
                <h5 className="admin-section-title" style={{ fontSize: "0.85rem", margin: 0 }}>
                  Payment instalments
                </h5>
                <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={recalcPaymentSchedule}>
                  Recalculate from Settings
                </button>
              </div>
              <p className="admin-vnd-new-hint" style={{ marginTop: 0, marginBottom: "0.65rem" }}>
                Amounts below print on the PDF. Edit labels, £ amounts, and due notes — or recalculate from{" "}
                <Link href="/admin/settings?tab=contract" className="admin-link">
                  Settings → Hire contract
                </Link>{" "}
                using the current contract sum ({formatGbp(totals.contractSumCents)}).
              </p>
              <div className="admin-pay-table-wrap" style={{ marginBottom: "0.75rem" }}>
                <table className="admin-pay-table admin-bkd-contract-lines">
                  <thead>
                    <tr>
                      <th>Label</th>
                      <th>Amount £</th>
                      <th>Due note</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {draft.paymentTerms.schedule.map((row, index) => (
                      <tr key={`sched-${index}`}>
                        <td>
                          <input
                            className="admin-table-inline-input"
                            value={row.label}
                            onChange={(e) => updateScheduleRow(index, { label: e.target.value })}
                          />
                        </td>
                        <td>
                          <input
                            className="admin-table-inline-input"
                            style={{ width: "5.5rem" }}
                            value={centsToPounds(row.amountCents)}
                            onChange={(e) => updateScheduleRow(index, { amountCents: poundsToCents(e.target.value) })}
                          />
                        </td>
                        <td>
                          <input
                            className="admin-table-inline-input"
                            value={row.dueNote}
                            onChange={(e) => updateScheduleRow(index, { dueNote: e.target.value })}
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="admin-btn admin-btn-ghost admin-btn-sm"
                            disabled={draft.paymentTerms.schedule.length <= 1}
                            onClick={() => removeScheduleRow(index)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={addScheduleRow}>
                + Instalment
              </button>
              <div className="admin-form-grid" style={{ marginTop: "1rem" }}>
                <div className="admin-form-group">
                  <label>Damage deposit (£)</label>
                  <input
                    value={centsToPounds(draft.paymentTerms.damageDepositCents)}
                    onChange={(e) =>
                      updatePaymentTermsPatch({ damageDepositCents: poundsToCents(e.target.value) })
                    }
                  />
                </div>
              </div>
              <textarea
                className="admin-settings-v2-input admin-settings-v2-textarea"
                rows={2}
                style={{ marginTop: "0.5rem" }}
                value={draft.paymentTerms.damageDepositNote || ""}
                onChange={(e) => updatePaymentTermsPatch({ damageDepositNote: e.target.value })}
                placeholder="Damage deposit note"
              />
              <textarea
                className="admin-settings-v2-input admin-settings-v2-textarea"
                rows={2}
                style={{ marginTop: "0.5rem" }}
                value={draft.paymentTerms.paymentMethodsNote || ""}
                onChange={(e) => updatePaymentTermsPatch({ paymentMethodsNote: e.target.value })}
                placeholder="Methods of payment"
              />
              <div className="admin-bkd-contract-bank-head" style={{ marginTop: "1.25rem", marginBottom: "0.75rem" }}>
                <p className="admin-vnd-new-hint" style={{ margin: 0, flex: 1 }}>
                  Bank block from{" "}
                  <Link href="/admin/settings?tab=business" className="admin-link">
                    Settings → Business &amp; bank
                  </Link>
                  .
                </p>
                <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={refreshBankFromSettings}>
                  Refresh from Settings
                </button>
              </div>
              {!bankConfigured ? (
                <p className="admin-bkd-contract-bank-warn" role="status">
                  No bank details yet — save them in Settings, then click Refresh from Settings.
                </p>
              ) : null}
              <div className="admin-form-grid admin-bkd-contract-bank-grid">
                <div className="admin-form-group">
                  <label>Bank</label>
                  <input
                    value={draft.paymentTerms.bankName === "—" ? "" : draft.paymentTerms.bankName}
                    onChange={(e) => updatePaymentTerm("bankName", e.target.value || "—")}
                  />
                </div>
                <div className="admin-form-group">
                  <label>Account name</label>
                  <input
                    value={draft.paymentTerms.accountName === "—" ? "" : draft.paymentTerms.accountName}
                    onChange={(e) => updatePaymentTerm("accountName", e.target.value || "—")}
                  />
                </div>
                <div className="admin-form-group">
                  <label>Sort code</label>
                  <input
                    value={draft.paymentTerms.sortCode === "—" ? "" : draft.paymentTerms.sortCode}
                    onChange={(e) => updatePaymentTerm("sortCode", e.target.value || "—")}
                  />
                </div>
                <div className="admin-form-group">
                  <label>Account number</label>
                  <input
                    value={draft.paymentTerms.accountNumber === "—" ? "" : draft.paymentTerms.accountNumber}
                    onChange={(e) => updatePaymentTerm("accountNumber", e.target.value || "—")}
                  />
                </div>
                <div className="admin-form-group admin-form-full">
                  <label>Payment reference hint</label>
                  <input
                    value={draft.paymentTerms.paymentReference || ""}
                    onChange={(e) => updatePaymentTerm("paymentReference", e.target.value)}
                    placeholder="e.g. Booking reference / invoice number"
                  />
                </div>
                <div className="admin-form-group admin-form-full">
                  <label>Cheques payable to</label>
                  <input
                    value={draft.paymentTerms.chequePayable === "—" ? "" : draft.paymentTerms.chequePayable}
                    onChange={(e) => updatePaymentTerm("chequePayable", e.target.value || "—")}
                  />
                </div>
              </div>
            </PdfSectionAccordion>

            <PdfSectionAccordion
              enabled={draft.include_terms}
              onToggle={() => setDraft((d) => (d ? { ...d, include_terms: !d.include_terms } : d))}
              title="Append full Terms & Conditions"
              desc="Adds the full T&amp;C appendix at the end of the PDF — editable below for this booking."
            >
              <p className="admin-vnd-new-hint" style={{ margin: "0 0 0.75rem" }}>
                Only edit if you need to change the legal wording for this booking. The last block is the signature page.
                To reset, use the button below or{" "}
                <Link href="/admin/settings?tab=contract" className="admin-link">
                  Settings → Hire contract
                </Link>
                .
              </p>
              <div className="admin-bkd-contract-toolbar" style={{ marginBottom: "0.75rem" }}>
                <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={resetTermsFromSettings}>
                  Reset T&amp;C from Settings
                </button>
                <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={addTermsSection}>
                  + Section
                </button>
              </div>
              <div className="admin-hire-settings-terms">
                {(draft.termsSections ?? []).map((section, index) => {
                  const isFirst = index === 0;
                  const isLast = index === (draft.termsSections?.length ?? 0) - 1;
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
            </PdfSectionAccordion>
          </div>

          <div className="admin-form-group admin-form-full" style={{ marginTop: "1rem" }}>
            <label>Contract notes (editable on PDF)</label>
            <textarea
              rows={3}
              value={draft.editableNotes}
              onChange={(e) => setDraft((d) => (d ? { ...d, editableNotes: e.target.value } : d))}
              placeholder="Any bespoke clauses or notes for this client…"
            />
          </div>
        </div>
      ) : !isStructuredPdf ? (
        <p className="admin-vnd-new-hint" style={{ marginTop: "0.5rem" }}>
          Text-based template — merges booking fields into the template body. For the official hire pack or T&amp;Cs, choose{" "}
          <strong>{BANQUETING_HIRE_TEMPLATE_LABEL}</strong> or <strong>{BANQUETING_TERMS_TEMPLATE_LABEL}</strong>.
        </p>
      ) : null}
    </div>

    <AgreementPdfPreviewModal
      open={pdfPreview.open}
      title={pdfPreview.title}
      pdfUrl={pdfPreview.pdfUrl}
      loading={pdfPreview.loading}
      error={pdfPreview.error}
      onClose={pdfPreview.close}
      onDownload={pdfPreview.onDownload}
    />
  </>
  );
}
