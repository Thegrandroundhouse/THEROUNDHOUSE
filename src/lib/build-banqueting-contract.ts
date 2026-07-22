import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getBookingHallIds,
  hallNamesLabel,
  listVenueHalls,
} from "@/lib/booking-halls";
import type { InvoiceBusinessPayload } from "@/app/api/admin/settings/invoice-business/route";
import { getBookingSlotsConfig } from "@/lib/booking-slots";
import {
  ADDITIONAL_HOURS_DEFAULT,
  ADDITIONAL_OPTIONS_DEFAULT,
  DEFAULT_INCLUDE_BULLETS,
  type ContractLineItem,
  type RoundhouseContractData,
  type RoundhouseContractSections,
  type RoundhouseIncludeBullets,
} from "@/lib/roundhouse-contract-types";
import {
  applyLegalNameTemplate,
  buildPaymentScheduleFromTemplate,
  HIRE_CONTRACT_SETTINGS_DEFAULTS,
  resolveIncludeItems,
  type HireContractSettingsPayload,
} from "@/lib/hire-contract-settings";
import { resolveTermsSections } from "@/lib/banqueting-terms-render";
import {
  VENUE_ADDRESS,
  VENUE_COMPANY_NUMBER,
  VENUE_LEGAL_NAME,
  VENUE_WEBSITE,
} from "@/lib/venue-constants";
import { normalizeStoredUkAddress } from "@/lib/uk-address";

function gbp(cents: number): string {
  return `£${(cents / 100).toFixed(2)}`;
}

function formatEventDate(dateStr: string | null | undefined): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr || "—";
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function slotTimes(slotKey: string | null, config: Awaited<ReturnType<typeof getBookingSlotsConfig>>) {
  if (!slotKey || slotKey === "whole_day" || !String(slotKey).trim()) {
    return {
      hirePeriod: "Full day hire",
      accessFrom: "06:00",
      startTime: "10:00",
      endTime: "18:00",
      slotLabel: "Full venue (whole day)",
    };
  }
  const def = config.slots.find((s) => s.key === slotKey);
  const label = def?.label || slotKey.replace(/_/g, " ");
  const timeLabel = def?.timeLabel || "";
  const parts = timeLabel.split(/[–-]/).map((s) => s.trim());
  return {
    hirePeriod: timeLabel ? `${label} · ${timeLabel}` : `${label} hire`,
    accessFrom: parts[0]?.replace(/\s/g, "") || "—",
    startTime: parts[0]?.replace(/\s/g, "") || "—",
    endTime: parts[1]?.replace(/\s/g, "") || "—",
    slotLabel: def ? `${def.label}${def.timeLabel ? ` · ${def.timeLabel}` : ""}` : slotKey,
  };
}

function calcLineItems(items: ContractLineItem[]) {
  let subtotal = 0;
  let discountTotal = 0;
  for (const row of items) {
    if (!row.included) continue;
    subtotal += row.qty * row.unitCostCents;
    discountTotal += row.discountCents;
  }
  return {
    subtotalCents: subtotal,
    discountTotalCents: discountTotal,
    contractSumCents: Math.max(0, subtotal - discountTotal),
  };
}

/** Ensure line-item numbers are valid and discount cannot exceed line subtotal. */
export function normalizeContractLineItems(items: ContractLineItem[]): ContractLineItem[] {
  return items.map((row) => {
    const qty = Math.max(1, Math.round(Number(row.qty) || 1));
    const unitCostCents = Math.max(0, Math.round(Number(row.unitCostCents) || 0));
    const lineSubtotal = qty * unitCostCents;
    const discountCents = Math.min(Math.max(0, Math.round(Number(row.discountCents) || 0)), lineSubtotal);
    return {
      ...row,
      qty,
      unitCostCents,
      discountCents,
      included: row.included !== false,
    };
  });
}

/** When contract sum changes (e.g. after discounts), keep instalment split in proportion. */
export function rescalePaymentSchedule(
  schedule: RoundhouseContractData["paymentTerms"]["schedule"],
  oldContractSumCents: number,
  newContractSumCents: number,
): RoundhouseContractData["paymentTerms"]["schedule"] {
  if (!schedule.length || oldContractSumCents <= 0 || oldContractSumCents === newContractSumCents) {
    return schedule;
  }
  const oldScheduleTotal = schedule.reduce((s, m) => s + m.amountCents, 0);
  if (Math.abs(oldScheduleTotal - oldContractSumCents) > 100) return schedule;
  let allocated = 0;
  return schedule.map((m, i) => {
    if (i === schedule.length - 1) {
      return { ...m, amountCents: Math.max(0, newContractSumCents - allocated) };
    }
    const next = Math.round((m.amountCents / oldContractSumCents) * newContractSumCents);
    allocated += next;
    return { ...m, amountCents: next };
  });
}

export function applyLineItemTotalsToContract(data: RoundhouseContractData): RoundhouseContractData {
  const lineItems = normalizeContractLineItems(data.lineItems);
  const totals = calcLineItems(lineItems);
  const schedule = rescalePaymentSchedule(data.paymentTerms.schedule, data.contractSumCents, totals.contractSumCents);
  const paidCents = Math.max(0, data.paidCents ?? 0);
  const oldAutoBalance = Math.max(0, data.contractSumCents - paidCents);
  const balanceWasManual =
    data.balanceDueCents != null && data.balanceDueCents !== oldAutoBalance;
  const balanceDueCents = balanceWasManual
    ? Math.max(0, data.balanceDueCents!)
    : Math.max(0, totals.contractSumCents - paidCents);
  return {
    ...data,
    lineItems,
    ...totals,
    paidCents,
    balanceDueCents,
    paymentTerms: { ...data.paymentTerms, schedule },
  };
}

export type BuildContractOptions = {
  sections?: Partial<RoundhouseContractSections>;
  includeBullets?: Partial<RoundhouseIncludeBullets>;
  include_terms?: boolean;
  includeItems?: RoundhouseContractData["includeItems"];
  introParagraph?: string;
  tableLinenNote?: string;
  additionalOptions?: RoundhouseContractData["additionalOptions"];
  additionalHoursIntro?: string;
  additionalHours?: RoundhouseContractData["additionalHours"];
  alcoholCorkageNote?: string;
  paymentTerms?: Partial<RoundhouseContractData["paymentTerms"]>;
  lineItems?: ContractLineItem[];
  exclusivity?: "Exclusive" | "Non Exclusive";
  suites?: string;
  guestCount?: string;
  salesRep?: string;
  enquiryRef?: string;
  clientAddress?: string;
  clientPhone?: string;
  editableNotes?: string;
  termsSections?: string[];
  accessFrom?: string;
  startTime?: string;
  endTime?: string;
  hirePeriod?: string;
  paidCents?: number;
  balanceDueCents?: number;
  showPaymentSummaryOnCover?: boolean;
};

export function resolveContractPaymentSummary(data: RoundhouseContractData): {
  paidCents: number;
  balanceDueCents: number;
} {
  const paidCents = Math.max(0, data.paidCents ?? 0);
  const balanceDueCents =
    data.balanceDueCents != null
      ? Math.max(0, data.balanceDueCents)
      : Math.max(0, data.contractSumCents - paidCents);
  return { paidCents, balanceDueCents };
}

export async function buildBanquetingContract(
  supabase: SupabaseClient,
  booking: Record<string, unknown>,
  business: InvoiceBusinessPayload | null,
  overrides: BuildContractOptions = {},
  hireSettings: HireContractSettingsPayload = HIRE_CONTRACT_SETTINGS_DEFAULTS,
): Promise<RoundhouseContractData> {
  const config = await getBookingSlotsConfig(supabase);
  const slotKey = (booking.event_slot_key as string | null) ?? null;
  const times = slotTimes(slotKey, config);
  const bookingId = String(booking.id || "");

  let packageLineItems: ContractLineItem[] = [];
  const packageId = booking.package_id as string | null;
  if (packageId) {
    const { data: pkg } = await supabase.from("packages").select("name, line_items, base_price_cents").eq("id", packageId).maybeSingle();
    if (pkg && Array.isArray(pkg.line_items)) {
      packageLineItems = (pkg.line_items as { label?: string; description?: string; amount_cents?: number }[]).map(
        (row, i) => ({
          id: `pkg-${i}`,
          description: [row.label, row.description].filter(Boolean).join(" — ") || "Package item",
          qty: 1,
          unitCostCents: Number(row.amount_cents) || 0,
          discountCents: 0,
          included: true,
        }),
      );
    }
    if (packageLineItems.length === 0 && pkg?.base_price_cents) {
      packageLineItems = [
        {
          id: "pkg-total",
          description: String(pkg.name || booking.package_name || "Venue hire"),
          qty: 1,
          unitCostCents: Number(pkg.base_price_cents) || 0,
          discountCents: 0,
          included: true,
        },
      ];
    }
  }

  if (packageLineItems.length === 0 && booking.total_cents != null) {
    packageLineItems = [
      {
        id: "booking-total",
        description: String(booking.package_name || times.slotLabel || "Venue hire"),
        qty: 1,
        unitCostCents: Number(booking.total_cents) || 0,
        discountCents: 0,
        included: true,
      },
    ];
  }

  const lineItems = overrides.lineItems?.length ? normalizeContractLineItems(overrides.lineItems) : packageLineItems;
  const totals = calcLineItems(lineItems);

  const [{ data: wd }, { data: ms }, { data: paymentRecs }] = await Promise.all([
    bookingId
      ? supabase.from("booking_wedding_details").select("guest_count").eq("booking_id", bookingId).maybeSingle()
      : Promise.resolve({ data: null }),
    bookingId
      ? supabase
          .from("booking_payment_milestones")
          .select("label, amount_cents, due_date, sort_order")
          .eq("booking_id", bookingId)
          .order("sort_order")
      : Promise.resolve({ data: [] as unknown[] }),
    bookingId
      ? supabase.from("payment_records").select("amount_cents, flow").eq("booking_id", bookingId)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  type PaymentRecRow = { amount_cents: number | null; flow: string };
  const paidFromLedger = ((paymentRecs ?? []) as PaymentRecRow[])
    .filter((r) => r.flow === "customer_in")
    .reduce((sum, r) => sum + (Number(r.amount_cents) || 0), 0);
  const paidCents = Math.max(0, overrides.paidCents ?? paidFromLedger);
  const balanceDueCents = Math.max(
    0,
    overrides.balanceDueCents ?? totals.contractSumCents - paidCents,
  );

  const guestCount =
    overrides.guestCount ||
    (wd?.guest_count != null && Number.isFinite(wd.guest_count) ? String(wd.guest_count) : "—");

  const totalCents = booking.total_cents as number | null;
  const depositCents = booking.deposit_cents as number | null;
  const depositPercent =
    totalCents && depositCents && totalCents > 0 ? Math.round((depositCents / totalCents) * 100) : 25;

  type MsRow = { label: string; amount_cents: number | null; due_date: string | null };
  const milestones: MsRow[] = Array.isArray(ms) ? (ms as MsRow[]) : [];
  const scheduleFromOverrides = overrides.paymentTerms?.schedule;
  const schedule =
    scheduleFromOverrides && scheduleFromOverrides.length > 0
      ? scheduleFromOverrides
      : milestones.length > 0
        ? milestones.map((m) => ({
            label: m.label,
            amountCents: Number(m.amount_cents) || 0,
            dueNote: m.due_date ? `due ${m.due_date}` : "as per contract",
          }))
        : buildPaymentScheduleFromTemplate(totals.contractSumCents, hireSettings.paymentSchedule);

  const damageDepositCents =
    overrides.paymentTerms?.damageDepositCents ??
    Math.round((hireSettings.damageDepositPounds > 0 ? hireSettings.damageDepositPounds : 2000) * 100);

  const legalName = business?.venueName?.trim() || VENUE_LEGAL_NAME;

  const [hallIds, venueHalls] = await Promise.all([
    getBookingHallIds(supabase, bookingId),
    listVenueHalls(supabase),
  ]);
  const hallLabel = hallNamesLabel(venueHalls, hallIds);
  const defaultSuites =
    hallIds.length > 0 ? hallLabel : String(booking.package_name || times.slotLabel);

  const sections: RoundhouseContractSections = {
    includes: hireSettings.sectionDefaults.includes,
    table_linen_note: hireSettings.sectionDefaults.table_linen_note,
    additional_options: hireSettings.sectionDefaults.additional_options,
    payment_terms: hireSettings.sectionDefaults.payment_terms,
    ...overrides.sections,
  };

  const resolvedIncludeItems =
    overrides.includeItems ??
    resolveIncludeItems(
      hireSettings,
      overrides.includeBullets as Partial<Record<string, boolean>> | undefined,
    );

  const includeBullets: RoundhouseIncludeBullets = { ...DEFAULT_INCLUDE_BULLETS };
  for (const item of resolvedIncludeItems) {
    if (item.id in includeBullets) {
      includeBullets[item.id as keyof RoundhouseIncludeBullets] = item.included;
    }
  }
  if (overrides.includeBullets) {
    Object.assign(includeBullets, overrides.includeBullets);
  }

  return {
    contract_type: "banqueting_hire",
    include_terms: overrides.include_terms ?? hireSettings.sectionDefaults.include_terms,
    sections,
    includeBullets,
    includeItems: resolvedIncludeItems,
    tableLinenNote:
      overrides.tableLinenNote ??
      applyLegalNameTemplate(hireSettings.tableLinenNote, legalName),
    additionalOptions: overrides.additionalOptions ?? hireSettings.additionalOptions.map((r) => ({ ...r })),
    additionalHoursIntro: overrides.additionalHoursIntro ?? hireSettings.additionalHoursIntro,
    additionalHours: overrides.additionalHours ?? hireSettings.additionalHours.map((r) => ({ ...r })),
    alcoholCorkageNote:
      overrides.alcoholCorkageNote ??
      applyLegalNameTemplate(hireSettings.alcoholCorkageNote, legalName),
    company: {
      legalName,
      companyNumber: VENUE_COMPANY_NUMBER,
      address: business?.venueAddress?.trim() || VENUE_ADDRESS,
      phone: business?.venuePhone?.trim() || "",
      email: business?.venueEmail?.trim() || "",
      website: VENUE_WEBSITE,
    },
    enquiry: {
      salesRep: overrides.salesRep || "—",
      quoteDate: new Date().toLocaleDateString("en-GB"),
      validity: "Immediately",
      enquiryRef: overrides.enquiryRef || String(booking.booking_code || booking.enquiry_id || "—"),
    },
    client: {
      name: String(booking.client_name || "Client"),
      phone: overrides.clientPhone || String(booking.client_phone || ""),
      email: String(booking.client_email || ""),
      address:
        normalizeStoredUkAddress(overrides.clientAddress) ||
        normalizeStoredUkAddress(String(booking.client_address || "")) ||
        "",
    },
    event: {
      dateLabel: formatEventDate(booking.event_date as string),
      type: String(booking.event_type || "Function"),
      hirePeriod: overrides.hirePeriod || times.hirePeriod,
      accessFrom: overrides.accessFrom || times.accessFrom,
      startTime: overrides.startTime || times.startTime,
      endTime: overrides.endTime || times.endTime,
      suites: overrides.suites || defaultSuites,
      exclusivity: overrides.exclusivity || "Non Exclusive",
      guestCount,
    },
    lineItems,
    ...totals,
    paidCents,
    balanceDueCents,
    showPaymentSummaryOnCover: overrides.showPaymentSummaryOnCover ?? true,
    introParagraph:
      overrides.introParagraph ||
      applyLegalNameTemplate(hireSettings.introParagraph, legalName),
    includesNotes: "",
    editableNotes: overrides.editableNotes || String(booking.notes || "").trim(),
    termsSections: (overrides.termsSections?.length
      ? overrides.termsSections
      : hireSettings.termsSections
    ).map((s) => applyLegalNameTemplate(s, legalName)),
    paymentTerms: {
      depositPercent,
      damageDepositCents,
      schedule,
      damageDepositNote: overrides.paymentTerms?.damageDepositNote ?? hireSettings.damageDepositNote,
      paymentMethodsNote: overrides.paymentTerms?.paymentMethodsNote ?? hireSettings.paymentMethodsNote,
      bankName: overrides.paymentTerms?.bankName ?? (business?.bankName?.trim() || "—"),
      sortCode: overrides.paymentTerms?.sortCode ?? (business?.sortCode?.trim() || "—"),
      accountName: overrides.paymentTerms?.accountName ?? (business?.accountName?.trim() || legalName),
      accountNumber: overrides.paymentTerms?.accountNumber ?? (business?.accountNumber?.trim() || "—"),
      chequePayable: overrides.paymentTerms?.chequePayable ?? (business?.accountName?.trim() || legalName),
      paymentReference:
        overrides.paymentTerms?.paymentReference ??
        (business?.paymentReference?.trim() || "Booking reference / invoice number"),
    },
  };
}

/** True when at least one bank field is filled (not placeholder dashes). */
export function hasContractBankDetails(pt: RoundhouseContractData["paymentTerms"]): boolean {
  const filled = (s: string | undefined) => Boolean(s && s.trim() && s.trim() !== "—");
  return filled(pt.bankName) || filled(pt.sortCode) || filled(pt.accountNumber) || filled(pt.accountName);
}

/** Pull bank block from Settings → Business & bank into a contract draft. */
export function applyBusinessBankToContract(
  data: RoundhouseContractData,
  business: InvoiceBusinessPayload | null,
): RoundhouseContractData {
  if (!business) return data;
  const legalName = business.venueName?.trim() || VENUE_LEGAL_NAME;
  return {
    ...data,
    paymentTerms: {
      ...data.paymentTerms,
      bankName: business.bankName?.trim() || "—",
      sortCode: business.sortCode?.trim() || "—",
      accountName: business.accountName?.trim() || legalName,
      accountNumber: business.accountNumber?.trim() || "—",
      chequePayable: business.accountName?.trim() || legalName,
      paymentReference: business.paymentReference?.trim() || data.paymentTerms.paymentReference || "Booking reference / invoice number",
    },
  };
}

export function contractDataToSummaryText(data: RoundhouseContractData): string {
  const lines = [
    `HIRE CONTRACT — ${data.client.name}`,
    `Event: ${data.event.dateLabel} · ${data.event.type}`,
    `Suite(s): ${data.event.suites} · ${data.event.exclusivity}`,
    `Guests: ${data.event.guestCount}`,
    "",
    "LINE ITEMS",
    ...data.lineItems
      .filter((r) => r.included)
      .map(
        (r) =>
          `  ${r.description} × ${r.qty} @ ${gbp(r.unitCostCents)}${r.discountCents ? ` (−${gbp(r.discountCents)})` : ""}`,
      ),
    "",
    `Contract sum: ${gbp(data.contractSumCents)}`,
  ];
  if (data.editableNotes) lines.push("", "Notes:", data.editableNotes);
  return lines.join("\n");
}

export function parseContractData(raw: unknown): RoundhouseContractData | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.contract_type !== "banqueting_hire") return null;
  if (!Array.isArray(o.lineItems)) return null;
  const base = o as unknown as RoundhouseContractData;
  const withTerms: RoundhouseContractData = {
    ...base,
    termsSections: resolveTermsSections(base.termsSections),
  };
  return applyLineItemTotalsToContract(withTerms);
}

export { ADDITIONAL_OPTIONS_DEFAULT, ADDITIONAL_HOURS_DEFAULT, gbp as formatGbp, calcLineItems };
