/** Structured hire contract (Mr Rahman / Roundhouse Banqueting layout). Stored in booking_agreements.custom_values. */

export type ContractLineItem = {
  id: string;
  description: string;
  qty: number;
  unitCostCents: number;
  discountCents: number;
  included: boolean;
};

export type RoundhouseContractSections = {
  includes: boolean;
  table_linen_note: boolean;
  additional_options: boolean;
  payment_terms: boolean;
};

export type RoundhouseIncludeBullets = {
  venue_hire: boolean;
  kitchen: boolean;
  car_park: boolean;
  tables_chairs: boolean;
  vip_suite: boolean;
  staff: boolean;
  stage: boolean;
  mood_lights: boolean;
  event_supervision: boolean;
  vat: boolean;
};

export type RoundhousePaymentMilestone = {
  label: string;
  amountCents: number;
  dueNote: string;
};

export type RoundhouseContractPaymentTerms = {
  depositPercent: number;
  damageDepositCents: number;
  schedule: RoundhousePaymentMilestone[];
  bankName: string;
  sortCode: string;
  accountName: string;
  accountNumber: string;
  chequePayable: string;
  /** e.g. booking code / invoice number — from Settings → Business & bank */
  paymentReference?: string;
  damageDepositNote?: string;
  paymentMethodsNote?: string;
};

export type RoundhouseContractIncludeItem = {
  id: string;
  label: string;
  included: boolean;
  subBullets?: string[];
};

export type RoundhouseContractPriceRow = { label: string; price: string };

export type RoundhouseContractData = {
  contract_type: "banqueting_hire";
  include_terms: boolean;
  sections: RoundhouseContractSections;
  includeBullets: RoundhouseIncludeBullets;
  /** When set, PDF uses this list instead of legacy includeBullets + INCLUDE_BULLET_LABELS. */
  includeItems?: RoundhouseContractIncludeItem[];
  tableLinenNote?: string;
  additionalOptions?: RoundhouseContractPriceRow[];
  additionalHoursIntro?: string;
  additionalHours?: RoundhouseContractPriceRow[];
  alcoholCorkageNote?: string;
  company: {
    legalName: string;
    companyNumber: string;
    address: string;
    phone: string;
    email: string;
    website: string;
  };
  enquiry: {
    salesRep: string;
    quoteDate: string;
    validity: string;
    enquiryRef: string;
  };
  client: {
    name: string;
    phone: string;
    email: string;
    address: string;
  };
  event: {
    dateLabel: string;
    type: string;
    hirePeriod: string;
    accessFrom: string;
    startTime: string;
    endTime: string;
    suites: string;
    exclusivity: "Exclusive" | "Non Exclusive";
    guestCount: string;
  };
  lineItems: ContractLineItem[];
  subtotalCents: number;
  discountTotalCents: number;
  contractSumCents: number;
  introParagraph: string;
  includesNotes: string;
  editableNotes: string;
  paymentTerms: RoundhouseContractPaymentTerms;
  /** Full T&C appendix sections — first line of each block is the heading; last block is acceptance. */
  termsSections?: string[];
};

export const BANQUETING_HIRE_SLUG = "banqueting-hire-contract";
export const BANQUETING_TERMS_SLUG = "banqueting-terms-conditions";

export const DEFAULT_INCLUDE_BULLETS: RoundhouseIncludeBullets = {
  venue_hire: true,
  kitchen: true,
  car_park: true,
  tables_chairs: true,
  vip_suite: true,
  staff: true,
  stage: true,
  mood_lights: true,
  event_supervision: true,
  vat: true,
};

export const INCLUDE_BULLET_LABELS: Record<keyof RoundhouseIncludeBullets, string> = {
  venue_hire: "Venue hire according to the suite(s), times and dates outlined within the contract",
  kitchen: "Use of the kitchen",
  car_park: "Use of the car park — complimentary parking for up to 225 spaces",
  tables_chairs: "Tables and Chiavari chairs (subject to number of guests)",
  vip_suite: "VIP bridal suite(s)",
  staff: "Staff (hostess, security, car park attendants, washroom & cloakroom attendants, event co-ordinator)",
  stage: "1 ft stage platform (size restrictions apply)",
  mood_lights: "Bespoke colour-changing mood lights",
  event_supervision: "Event supervision including:",
  vat: "VAT where applicable",
};

export const EVENT_SUPERVISION_SUB_BULLETS = [
  "Floor planning (3 iterations)",
  "Event itinerary",
  "Supplier advice",
  "Three face-to-face meetings",
] as const;

/** Full table linen paragraph from official hire contract pack. */
export function tableLinenParagraph(legalName: string): string {
  return `${legalName} does not provide table linen as part of the dry hire offering, however we do insist that caterers bring the correct sized linen for our tables. The tables are 6ft and therefore 132" round cloths are required. Cloths may be hired at a cost of £6 per table cloth. Please be advised that if arrangements for linen are made after two weeks prior to the event, a late arrangement fee of £100 will be incurred.`;
}

export const CONTRACT_PAGE_COUNT = 4;

export const ADDITIONAL_OPTIONS_DEFAULT = [
  { label: "Eternity Suite", price: "£1,500.00" },
  { label: "Infinity Suite", price: "£1,000.00" },
  { label: "Chiavari Chairs", price: "£3 per chair" },
  { label: "Lazy Suzans", price: "£15 per table" },
  { label: "Crockery and Cutlery", price: "£2 per head" },
  { label: "Glassware", price: "£1 per head" },
  { label: "Still and Sparkling Water", price: "£1 per head" },
  { label: "Crushed Velvet Cloths", price: "£6 per table" },
];

export const ADDITIONAL_HOURS_DEFAULT = [
  { label: "Whole Venue", price: "£1,500.00 per hour" },
  { label: "Grand Ballroom", price: "£1,000.00 per hour" },
  { label: "Meridian Ballroom", price: "£750.00 per hour" },
];
