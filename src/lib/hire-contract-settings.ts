import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ADDITIONAL_HOURS_DEFAULT,
  ADDITIONAL_OPTIONS_DEFAULT,
  DEFAULT_INCLUDE_BULLETS,
  EVENT_SUPERVISION_SUB_BULLETS,
  INCLUDE_BULLET_LABELS,
  tableLinenParagraph,
  type RoundhouseContractSections,
  type RoundhousePaymentMilestone,
} from "@/lib/roundhouse-contract-types";
import { ROUNDHOUSE_BANQUETING_TERMS_SECTIONS } from "@/lib/roundhouse-terms-sections";
import { VENUE_LEGAL_NAME } from "@/lib/venue-constants";

export type HireContractIncludeItemTemplate = {
  id: string;
  label: string;
  enabledByDefault: boolean;
  subBullets?: string[];
};

export type HireContractPriceRow = { label: string; price: string };

/** Default instalment rows — amounts are calculated from contract sum using percentOfContract. */
export type HireContractPaymentMilestoneTemplate = {
  label: string;
  dueNote: string;
  percentOfContract: number;
};

export type HireContractSettingsPayload = {
  sectionDefaults: RoundhouseContractSections & { include_terms: boolean };
  introParagraph: string;
  tableLinenNote: string;
  includeItems: HireContractIncludeItemTemplate[];
  additionalOptions: HireContractPriceRow[];
  additionalHoursIntro: string;
  additionalHours: HireContractPriceRow[];
  alcoholCorkageNote: string;
  paymentSchedule: HireContractPaymentMilestoneTemplate[];
  damageDepositPounds: number;
  damageDepositNote: string;
  paymentMethodsNote: string;
  /** T&C appendix — each string: first line = heading, rest = body; last section = acceptance block. */
  termsSections: string[];
};

const DEFAULT_INTRO =
  `Contract is subject to {{legalName}}'s approval of the client's chosen caterer where applicable. Contract is only according to the dates and times given above; any change in these details must be agreed and approved by {{legalName}} in writing. {{legalName}} remain committed to providing exceptional service and a memorable event on the date stated. However, the management reserve the right to amend or substitute any product or service within this contract. {{legalName}} will not be held responsible or liable for any changes or alterations made due to circumstances out of our control. *{{legalName}} does not exclusively hold or block dates for the client until a deposit has been paid.`;

function defaultIncludeItems(): HireContractIncludeItemTemplate[] {
  return (Object.keys(DEFAULT_INCLUDE_BULLETS) as (keyof typeof DEFAULT_INCLUDE_BULLETS)[]).map((id) => ({
    id,
    label: INCLUDE_BULLET_LABELS[id],
    enabledByDefault: DEFAULT_INCLUDE_BULLETS[id],
    subBullets: id === "event_supervision" ? [...EVENT_SUPERVISION_SUB_BULLETS] : undefined,
  }));
}

function defaultPaymentSchedule(): HireContractPaymentMilestoneTemplate[] {
  return [
    { label: "On Booking Confirmation", dueNote: "25% of contract sum (non-refundable deposit)", percentOfContract: 25 },
    { label: "6 months before function", dueNote: "25% of contract due", percentOfContract: 25 },
    { label: "4 months before function", dueNote: "25% of contract due", percentOfContract: 25 },
    { label: "2 months before function", dueNote: "25% of contract due", percentOfContract: 25 },
  ];
}

export const DEFAULT_PAYMENT_SCHEDULE_TEMPLATE = defaultPaymentSchedule();

export const HIRE_CONTRACT_SETTINGS_DEFAULTS: HireContractSettingsPayload = {
  sectionDefaults: {
    includes: true,
    table_linen_note: true,
    additional_options: true,
    payment_terms: true,
    include_terms: true,
  },
  introParagraph: DEFAULT_INTRO,
  tableLinenNote: tableLinenParagraph(VENUE_LEGAL_NAME).replaceAll(VENUE_LEGAL_NAME, "{{legalName}}"),
  includeItems: defaultIncludeItems(),
  additionalOptions: ADDITIONAL_OPTIONS_DEFAULT.map((r) => ({ ...r })),
  additionalHoursIntro:
    "Additional hours are charged when a client exceeds their hire period or wishes to extend after midnight.",
  additionalHours: ADDITIONAL_HOURS_DEFAULT.map((r) => ({ ...r })),
  alcoholCorkageNote:
    "If alcohol is being served at the function, either drinks or corkage must be purchased as an additional option from {{legalName}}.",
  paymentSchedule: defaultPaymentSchedule(),
  damageDepositPounds: 2000,
  damageDepositNote:
    "The damage deposit is refunded two weeks after your function, subject to breakages / deviations from contract.",
  paymentMethodsNote: "Payments can be made via bank transfer, debit card, credit card, cheque or cash.",
  termsSections: ROUNDHOUSE_BANQUETING_TERMS_SECTIONS.map((s) => s),
};

export function applyLegalNameTemplate(text: string, legalName: string): string {
  return text.replaceAll("{{legalName}}", legalName);
}

function normalizeIncludeItems(raw: unknown): HireContractIncludeItemTemplate[] {
  if (!Array.isArray(raw) || raw.length === 0) return defaultIncludeItems();
  const out: HireContractIncludeItemTemplate[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const id = typeof o.id === "string" && o.id.trim() ? o.id.trim() : `item-${out.length + 1}`;
    const label = typeof o.label === "string" ? o.label.trim() : "";
    if (!label) continue;
    const enabledByDefault = o.enabledByDefault !== false;
    const subBullets = Array.isArray(o.subBullets)
      ? o.subBullets
          .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
          .map((s) => s.trim())
      : undefined;
    out.push({ id, label, enabledByDefault, subBullets: subBullets?.length ? subBullets : undefined });
  }
  return out.length ? out : defaultIncludeItems();
}

function normalizePriceRows(raw: unknown, fallback: HireContractPriceRow[]): HireContractPriceRow[] {
  if (!Array.isArray(raw)) return fallback.map((r) => ({ ...r }));
  const out: HireContractPriceRow[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const label = typeof o.label === "string" ? o.label.trim() : "";
    const price = typeof o.price === "string" ? o.price.trim() : "";
    if (label) out.push({ label, price: price || "—" });
  }
  return out.length ? out : fallback.map((r) => ({ ...r }));
}

function normalizePaymentSchedule(raw: unknown): HireContractPaymentMilestoneTemplate[] {
  if (!Array.isArray(raw) || raw.length === 0) return defaultPaymentSchedule();
  const out: HireContractPaymentMilestoneTemplate[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const label = typeof o.label === "string" ? o.label.trim() : "";
    if (!label) continue;
    const dueNote = typeof o.dueNote === "string" ? o.dueNote : "";
    const pct = Number(o.percentOfContract);
    out.push({
      label,
      dueNote,
      percentOfContract: Number.isFinite(pct) && pct > 0 ? Math.min(100, pct) : 0,
    });
  }
  return out.length ? out : defaultPaymentSchedule();
}

function normalizeTermsSections(raw: unknown): string[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return ROUNDHOUSE_BANQUETING_TERMS_SECTIONS.map((s) => s);
  }
  const out = raw
    .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    .map((s) => s.trim());
  return out.length ? out : ROUNDHOUSE_BANQUETING_TERMS_SECTIONS.map((s) => s);
}

function normalizeSectionDefaults(raw: unknown): HireContractSettingsPayload["sectionDefaults"] {
  const d = HIRE_CONTRACT_SETTINGS_DEFAULTS.sectionDefaults;
  if (!raw || typeof raw !== "object") return { ...d };
  const o = raw as Record<string, unknown>;
  return {
    includes: o.includes !== false,
    table_linen_note: o.table_linen_note !== false,
    additional_options: o.additional_options !== false,
    payment_terms: o.payment_terms !== false,
    include_terms: o.include_terms !== false,
  };
}

export function parseHireContractSettingsValue(value: unknown): HireContractSettingsPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return structuredClone(HIRE_CONTRACT_SETTINGS_DEFAULTS);
  }
  const o = value as Record<string, unknown>;
  return {
    sectionDefaults: normalizeSectionDefaults(o.sectionDefaults),
    introParagraph:
      typeof o.introParagraph === "string" && o.introParagraph.trim()
        ? o.introParagraph
        : HIRE_CONTRACT_SETTINGS_DEFAULTS.introParagraph,
    tableLinenNote:
      typeof o.tableLinenNote === "string" && o.tableLinenNote.trim()
        ? o.tableLinenNote
        : HIRE_CONTRACT_SETTINGS_DEFAULTS.tableLinenNote,
    includeItems: normalizeIncludeItems(o.includeItems),
    additionalOptions: normalizePriceRows(o.additionalOptions, HIRE_CONTRACT_SETTINGS_DEFAULTS.additionalOptions),
    additionalHoursIntro:
      typeof o.additionalHoursIntro === "string"
        ? o.additionalHoursIntro
        : HIRE_CONTRACT_SETTINGS_DEFAULTS.additionalHoursIntro,
    additionalHours: normalizePriceRows(o.additionalHours, HIRE_CONTRACT_SETTINGS_DEFAULTS.additionalHours),
    alcoholCorkageNote:
      typeof o.alcoholCorkageNote === "string" && o.alcoholCorkageNote.trim()
        ? o.alcoholCorkageNote
        : HIRE_CONTRACT_SETTINGS_DEFAULTS.alcoholCorkageNote,
    paymentSchedule: normalizePaymentSchedule(o.paymentSchedule),
    damageDepositPounds:
      typeof o.damageDepositPounds === "number" && o.damageDepositPounds >= 0
        ? o.damageDepositPounds
        : HIRE_CONTRACT_SETTINGS_DEFAULTS.damageDepositPounds,
    damageDepositNote:
      typeof o.damageDepositNote === "string" && o.damageDepositNote.trim()
        ? o.damageDepositNote
        : HIRE_CONTRACT_SETTINGS_DEFAULTS.damageDepositNote,
    paymentMethodsNote:
      typeof o.paymentMethodsNote === "string" && o.paymentMethodsNote.trim()
        ? o.paymentMethodsNote
        : HIRE_CONTRACT_SETTINGS_DEFAULTS.paymentMethodsNote,
    termsSections: normalizeTermsSections(o.termsSections),
  };
}

export function normalizeHireContractSettingsBody(body: unknown): HireContractSettingsPayload {
  return parseHireContractSettingsValue(body);
}

export type ResolvedIncludeItem = {
  id: string;
  label: string;
  included: boolean;
  subBullets?: string[];
};

/** Map settings templates onto contract include toggles (per-booking overrides optional). */
export function resolveIncludeItems(
  settings: HireContractSettingsPayload,
  overrides?: Partial<Record<string, boolean>>,
): ResolvedIncludeItem[] {
  return settings.includeItems.map((item) => ({
    id: item.id,
    label: item.label,
    included: overrides && item.id in overrides ? Boolean(overrides[item.id]) : item.enabledByDefault,
    subBullets: item.subBullets?.length ? [...item.subBullets] : undefined,
  }));
}

export async function loadHireContractSettingsFromDb(
  supabase: SupabaseClient,
): Promise<HireContractSettingsPayload> {
  const { data } = await supabase.from("site_settings").select("value").eq("key", "hire_contract_defaults").maybeSingle();
  return data?.value ? parseHireContractSettingsValue(data.value) : structuredClone(HIRE_CONTRACT_SETTINGS_DEFAULTS);
}

/** Build PDF payment instalments from contract sum and a percent-based template. */
export function buildPaymentScheduleFromTemplate(
  contractSumCents: number,
  template: HireContractPaymentMilestoneTemplate[],
): RoundhousePaymentMilestone[] {
  if (!template.length || contractSumCents <= 0) {
    return template.map((t) => ({ label: t.label, amountCents: 0, dueNote: t.dueNote }));
  }
  const usePercents = template.some((t) => t.percentOfContract > 0);
  let allocated = 0;
  return template.map((t, i) => {
    const isLast = i === template.length - 1;
    let amountCents = 0;
    if (usePercents && t.percentOfContract > 0) {
      if (isLast) {
        amountCents = Math.max(0, contractSumCents - allocated);
      } else {
        amountCents = Math.round((contractSumCents * t.percentOfContract) / 100);
        allocated += amountCents;
      }
    }
    return { label: t.label, amountCents, dueNote: t.dueNote };
  });
}
