/**
 * Staff-facing CRM user guide — source text for the Settings PDF download.
 * Keep in sync with sidebar routes and booking workspace tabs.
 */
import { ADMIN_APP_NAME, VENUE_ADDRESS, VENUE_BRAND_NAME, BANQUETING_HIRE_TEMPLATE_LABEL } from "@/lib/venue-constants";

export type GuideSection = {
  id: string;
  title: string;
  path?: string;
  paragraphs: string[];
  bullets?: string[];
  connectsTo?: string[];
};

export const CRM_GUIDE_INTRO = {
  title: `${ADMIN_APP_NAME} — Staff CRM User Guide`,
  subtitle: "How every feature works and how they connect",
  venue: `${VENUE_BRAND_NAME} · ${VENUE_ADDRESS}`,
  version: "May 2026",
};

export const CRM_GUIDE_FLOW = `THE CLIENT JOURNEY (end to end)

1. ENQUIRY — A couple or client submits the website contact form, or you add an enquiry manually. Status moves: New → Contacted → Quoted → Converted (or Lost).

2. CALENDAR — Check the event date is free. Morning / afternoon / evening / night slots come from Settings → Booking slots. Whole-day bookings block the entire venue for that date.

3. BOOKING — Convert the enquiry or create a booking from Calendar / Bookings → New. Pick a package (from Packages), set money (total, deposit, balance), and assign a time slot.

4. CONTRACT — On the booking page, open tab “3 · Contracts”. Generate the ${BANQUETING_HIRE_TEMPLATE_LABEL} PDF. Line items pull from the package; business details pull from Settings → Business & bank.

5. PAYMENTS — Tab “4 · Payments” and Payments in the sidebar record deposits and milestones. The booking banner and Overview show what is collected vs outstanding.

6. INVOICE — Create an invoice linked to the booking (Invoices). PDF uses Settings logo and business details.

7. EVENT DAY — Wedding details tab holds guest count, menu, timeline. Tasks, vendors, documents, and comms tabs track everything else.

8. REPORTS — Reports and Dashboard charts summarise revenue and booking volume.`;

export const CRM_GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "overview",
    title: "1. Overview",
    paragraphs: [
      "The admin area is organised in the left sidebar. Work top to bottom through Sales pipeline, then Finance, then Catalogue.",
    ],
    bullets: [
      "Dashboard (/admin) — KPI cards, revenue chart, upcoming events, open reminders, recent invoices and payments.",
      "Reminders (/admin/reminders) — Staff to-dos with optional links to a booking or invoice. Set reminders from a booking page too.",
      "Operations hub (/admin/operations) — Quick map of every CRM module and how they link.",
    ],
    connectsTo: ["Sales pipeline", "Finance", "Settings"],
  },
  {
    id: "enquiries",
    title: "2. Enquiries (start of sales)",
    path: "/admin/enquiries",
    paragraphs: [
      "Every lead lives here until it becomes a booking. Open an enquiry to update status, add notes, hold a date (soft hold on calendar), and convert to booking when ready.",
    ],
    bullets: [
      "Statuses: New, Contacted, Quoted, Converted, Lost.",
      "Date holds reserve a slot temporarily — shown on Calendar with expiry.",
      "Convert to booking — copies client details and creates a booking you can open immediately.",
    ],
    connectsTo: ["Calendar", "Bookings", "Packages (for quoting)"],
  },
  {
    id: "calendar",
    title: "3. Calendar & availability",
    path: "/admin/calendar",
    paragraphs: [
      "Master view of which dates are free, partially booked, or fully blocked. Click a date to see bookings on that day or create a new booking pre-filled with that date.",
    ],
    bullets: [
      "Slot bands (morning, afternoon, etc.) are configured in Settings → Booking slots.",
      "Whole venue / whole day — one booking blocks all other slots on that date.",
      "Block days — close the venue for maintenance or private use (multi-day range supported).",
      "Each booking links through to its full workspace (/admin/bookings/[id]).",
    ],
    connectsTo: ["Bookings", "Settings → Booking slots", "Enquiries (holds)"],
  },
  {
    id: "bookings",
    title: "4. Bookings (central record)",
    path: "/admin/bookings",
    paragraphs: [
      "A booking is the single source of truth for an event. The booking code (e.g. RH-2026-001) appears on invoices, payments, contracts, and exports.",
    ],
    bullets: [
      "Quick update (dropdown on booking page) — Edit client, date, slot, package, and money without a popup. Expand → Save changes.",
      "Status — Pending, Confirmed, Cancelled, Completed (completed only after event date has passed).",
      "Upcoming (/admin/upcoming) — List view of future bookings sorted by event date.",
      "Export PDF — Full dossier with toggles for client, money, wedding details, vendors, etc.",
    ],
    connectsTo: ["Packages", "Payments", "Invoices", "Agreements", "Vendors", "Settings"],
  },
  {
    id: "workspace",
    title: "5. Booking workspace (8 tabs)",
    path: "/admin/bookings/[id]",
    paragraphs: [
      "Below the booking header, the workspace tabs follow the order you should work through:",
    ],
    bullets: [
      "1 · Summary — Reservation, money, package, payment milestones, progress chips, invoices.",
      "2 · Event details — Guest count, space/suite, menu, décor, seating, timeline (saved to booking_wedding_details).",
      `3 · Contracts — Generate ${BANQUETING_HIRE_TEMPLATE_LABEL} PDF; optional T&Cs; sign tracking.`,
      "4 · Payments — Milestone schedule (deposit, balance); links to full ledger.",
      "5 · Tasks — Checklist per booking; optional workflow templates.",
      "6 · Vendors — Link suppliers from the vendor directory with a role.",
      "7 · Documents — Upload files or add URLs (contracts, floor plans, etc.).",
      "8 · Comms — Log emails, calls, and notes against the booking.",
    ],
    connectsTo: ["Agreements templates", "Payments ledger", "Vendors", "Settings → Business"],
  },
  {
    id: "packages",
    title: "6. Packages & catalogue",
    path: "/admin/packages",
    paragraphs: [
      "Packages define what you sell: name, base price, line items, included features, and which time slots they apply to.",
    ],
    bullets: [
      "When you pick a package on a booking, total can auto-fill from base price.",
      "Contract line items are built from package line items when generating hire contracts.",
      "Season pricing (/admin/pricing) — Adjust rates by season; links to calendar pricing rules where configured.",
    ],
    connectsTo: ["Bookings", "Contracts", "Season pricing"],
  },
  {
    id: "vendors",
    title: "7. Vendors",
    path: "/admin/vendors",
    paragraphs: [
      "Directory of photographers, caterers, florists, etc. Link vendors to a booking from the booking workspace → Vendors tab.",
    ],
    bullets: [
      "Vendor type helps filter the directory.",
      "Linked vendors appear on booking export PDF when that section is enabled.",
    ],
    connectsTo: ["Booking workspace → Vendors"],
  },
  {
    id: "payments",
    title: "8. Payments",
    path: "/admin/payments",
    paragraphs: [
      "Track money received against bookings. Each booking can have payment milestones (deposit, balance, damage deposit).",
    ],
    bullets: [
      "Booking ledger (/admin/payments/booking/[id]) — Record payments, refunds, and see running totals.",
      "Milestone status: Not paid, Partial, Paid, Refunded, Waived — editable on booking Overview and Payments tab.",
      "Dashboard and booking banner show collected vs outstanding at a glance.",
    ],
    connectsTo: ["Bookings", "Invoices", "Reports"],
  },
  {
    id: "invoices",
    title: "9. Invoices",
    path: "/admin/invoices",
    paragraphs: [
      "Formal bills for clients. Link an invoice to a booking so context (client, event date) flows through.",
    ],
    bullets: [
      "PDF — Uses venue name, address, phone, email, bank from Settings → Business & bank.",
      "Logo — Settings → Invoice logo when “Use preferred logo” is selected on the invoice.",
      "Statuses: draft, sent, paid, overdue, cancelled (as configured on each invoice).",
    ],
    connectsTo: ["Settings → Business & logo", "Bookings", "Reminders"],
  },
  {
    id: "agreements",
    title: "10. Agreements & contracts",
    path: "/admin/agreements",
    paragraphs: [
      `Agreement templates live here. The preferred template for hire is “${BANQUETING_HIRE_TEMPLATE_LABEL}”.`,
    ],
    bullets: [
      "Generate from booking — Tab 3 · Contracts; configure line items, sections, then PDF.",
      "Preview PDF — Check layout before saving; same for T&C and text templates.",
      "Default hire pack is 4 pages (contract, includes, options, payment). Page 4 includes bank details from Settings → Business & bank.",
      "Append full T&Cs only when needed — otherwise keep as separate document.",
      "Client signed / Venue signed — Tick on the agreements table after signatures.",
      "Legacy text templates still support merge fields for simple letters.",
    ],
    connectsTo: ["Bookings", "Packages", "Settings → Business", "Packages line items"],
  },
  {
    id: "reports",
    title: "11. Reports",
    path: "/admin/reports",
    paragraphs: ["Summaries for management: bookings by period, revenue, enquiry conversion."],
    bullets: [
      "Use alongside Dashboard charts for month-on-month trends.",
      "Booking and payment data feeds reports automatically — no separate export needed for basic stats.",
    ],
    connectsTo: ["Bookings", "Payments", "Enquiries"],
  },
  {
    id: "team",
    title: "12. Team, audit & staff",
    paragraphs: ["Staff accounts access the admin with role admin or staff. Admins see Audit log."],
    bullets: [
      "Staff (/admin/staff) — Invite or manage team members.",
      "Audit log (/admin/audit-log) — Admin only. Records changes to settings, bookings, and key records.",
    ],
    connectsTo: ["Settings", "All modules (logged actions)"],
  },
  {
    id: "settings",
    title: "13. Settings (configure once)",
    path: "/admin/settings",
    paragraphs: [
      "Settings feed into invoices, contracts, and booking forms across the CRM. Update when venue or bank details change.",
    ],
    bullets: [
      "Invoice logo — PNG/JPG on invoice PDFs.",
      "Business & bank — Venue name, Lodge Avenue address, phone, email, sort code, account. Used on invoices, hire contracts, and booking exports.",
      "Booking slots — Enable slots, max per slot, whole-day option, labels and times. Calendar and new booking forms read this.",
      "Season pricing (/admin/pricing) — Date bands and day overrides; suggested total on new booking.",
      "CRM guide PDF — Download this document anytime from Settings → User guide.",
    ],
    connectsTo: ["Invoices", "Agreements", "Bookings", "Calendar", "Enquiries"],
  },
  {
    id: "connections",
    title: "14. Quick reference — what connects to what",
    paragraphs: ["Use this table when training new staff:"],
    bullets: [
      "Settings → Business → Invoices PDF, Hire contract PDF, Booking export page 1.",
      "Settings → Logo → Invoice PDF header.",
      "Settings → Booking slots → Calendar, New booking, Enquiry convert, Package slot chips.",
      "Package → Booking total, Contract line items, Overview package card.",
      "Booking → Payments ledger, Invoices (link), Agreements, Vendors, Documents, Comms.",
      "Enquiry → Convert → Booking; Holds → Calendar.",
      "Reminders → Optional booking_id or invoice_id link.",
    ],
  },
];

export const CRM_GUIDE_CHECKLIST = [
  "Configure Settings → Business & bank and Booking slots before taking live bookings.",
  "Create packages with prices and line items.",
  "Add vendors you work with regularly.",
  "When a lead arrives: Enquiry → hold date on Calendar if needed → Convert to booking.",
  "On booking: Quick update → Confirm package & money → Generate contract → Record deposit in Payments.",
  "Send invoice PDF; log comms on the booking.",
  "Use workspace tabs through to event day (tasks, vendors, documents).",
  "Mark booking Completed after the event; check Reports monthly.",
];

/** Visual pipeline for PDF diagram — client journey left to right. */
export type GuidePipelineStep = {
  step: number;
  title: string;
  path: string;
  short: string;
};

export const CRM_GUIDE_PIPELINE: GuidePipelineStep[] = [
  { step: 1, title: "Enquiry", path: "/admin/enquiries", short: "Lead from website or manual" },
  { step: 2, title: "Calendar", path: "/admin/calendar", short: "Check date & slots free" },
  { step: 3, title: "Booking", path: "/admin/bookings", short: "Central event record" },
  { step: 4, title: "Contract", path: "/admin/agreements", short: "Hire PDF from tab 3" },
  { step: 5, title: "Payments", path: "/admin/payments", short: "Deposits & milestones" },
  { step: 6, title: "Invoice", path: "/admin/invoices", short: "Client bill PDF" },
  { step: 7, title: "Event day", path: "/admin/bookings/[id]", short: "Tasks, vendors, comms" },
  { step: 8, title: "Reports", path: "/admin/reports", short: "Revenue & volume" },
];

/** Settings hub — what each tab feeds (PDF diagram). */
export type GuideSettingsFeed = {
  setting: string;
  feeds: string[];
};

export const CRM_GUIDE_SETTINGS_HUB: GuideSettingsFeed[] = [
  { setting: "Invoice logo", feeds: ["Invoice PDF header when preferred logo is selected"] },
  {
    setting: "Business & bank",
    feeds: ["Invoice PDF", "Hire contract PDF", "Terms & Conditions", "Booking export cover"],
  },
  {
    setting: "Booking slots",
    feeds: ["Contact form", "New booking", "Calendar capacity", "Package slot rules"],
  },
  { setting: "Season pricing", feeds: ["Suggested total on new booking (override → season → manual)"] },
];

/** Booking workspace tabs in order (PDF diagram). */
export type GuideWorkspaceTab = {
  n: number;
  name: string;
  focus: string;
};

export const CRM_GUIDE_WORKSPACE_TABS: GuideWorkspaceTab[] = [
  { n: 1, name: "Summary", focus: "Money, package, milestones, invoices" },
  { n: 2, name: "Event details", focus: "Guests, menu, timeline, décor" },
  { n: 3, name: "Contracts", focus: "Generate hire PDF, signatures" },
  { n: 4, name: "Payments", focus: "Deposit & balance schedule" },
  { n: 5, name: "Tasks", focus: "Checklist per booking" },
  { n: 6, name: "Vendors", focus: "Linked suppliers" },
  { n: 7, name: "Documents", focus: "Files & URLs" },
  { n: 8, name: "Comms", focus: "Calls, emails, notes" },
];

/** Connection matrix rows for PDF table. */
export const CRM_GUIDE_CONNECTION_TABLE: { source: string; destination: string }[] = [
  { source: "Settings → Business", destination: "Invoices, contracts, T&Cs, booking export" },
  { source: "Settings → Logo", destination: "Invoice PDF header" },
  { source: "Settings → Booking slots", destination: "Calendar, new booking, enquiry form, packages" },
  { source: "Settings → Season pricing", destination: "Suggested price on new booking" },
  { source: "Package", destination: "Booking total, contract line items" },
  { source: "Enquiry", destination: "Convert → booking; holds → calendar" },
  { source: "Booking", destination: "Payments, invoices, contracts, vendors, export PDF" },
  { source: "Reminders", destination: "Optional link to booking or invoice" },
];

export const CRM_GUIDE_TOC = [
  "Client journey pipeline (diagram)",
  "Settings hub — what feeds the CRM (diagram)",
  "Booking workspace — 8 tabs (diagram)",
  "Module-by-module reference",
  "Connection matrix & daily checklist",
];
