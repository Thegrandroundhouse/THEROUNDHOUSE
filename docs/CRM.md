# CRM & admin — full guide (The Grand Round House)

Everything under **`/admin`** after login. The **sidebar** is the main map; this doc mirrors **every page** and how it fits together.

---

## Access

| Item | Detail |
|------|--------|
| **Login** | `/admin-login` — Supabase Auth (admin users). |
| **Guard** | `AdminGuard` wraps all `/admin` routes. |
| **Roles** | **`admin`** sees **Audit log** in the sidebar; other roles do not. |
| **Shell** | `AdminShell`: sidebar, top bar (menu, search placeholder, profile), **Open public site**, sign out. |

---

## Sidebar navigation (what lives where)

### Overview

| Page | Path | What you do here |
|------|------|------------------|
| **Dashboard** | `/admin` | Welcome, **stats** (bookings, enquiries, revenue, reminders, invoices, vendors), **revenue bar chart**, **upcoming bookings**, **reminders due**, recent **invoices**, **vendors**, **payments**. |
| **Reminders** | `/admin/reminders` | Follow-ups tied to **bookings** or **invoices** (`remind_at`, done flag). Create / mark done. |

### Events & sales

| Page | Path | What you do here |
|------|------|------------------|
| **Calendar** | `/admin/calendar` | **Month grid** of bookings: day cells, **modal** for a date (bookings + **customer time / slot**). Block/unblock days via **`venue_calendar`**. Range tools, conflicts vs bookings. |
| **Bookings** | `/admin/bookings` | **List + filters** (search, status). **Stats cards**. Table with links to each booking. **Add booking** → `/admin/bookings/new`. |
| **New booking** | `/admin/bookings/new` | Create booking: client, **date**, **event type**, **package** (optional, can restrict **slots**), **time slot** / whole day, pricing, deposit, enquiry id prefill from CRM. Availability hints. |
| **Booking detail** | `/admin/bookings/[id]` | **Unified banner**: client, date, status. **Event card** + **date/slot availability** panel (excludes this booking). **Edit booking** modal: client, date, **wedding/time slot**, package, money, status. **Workspace**: wedding details, **payment milestones**, **tasks**, **documents**, **communications**, **vendors**. **Invoices** for this booking. **Export PDF** (dossier, section checklist). **Set reminder**. **Delete** booking. |
| **Upcoming bookings** | `/admin/upcoming` | Paged list of future **pending/confirmed** events (same feed style as sidebar). **Export CSV / PDF**. |
| **Enquiries** | `/admin/enquiries` | CRM **table only**: name, email, function, **event date**, **slot**, status, submitted. **Export CSV / PDF**. Filters + pager. |
| **Enquiry detail** | `/admin/enquiries/[id]` | **Banner** + **stats**. Message & metadata. **Preferred date + time slot** (saved to lead). **Availability advisory** for that date. **Soft date hold**: whole day or **slot-only**, duration 24h–14d; **Release hold**. Pipeline status, notes, follow-up. **Create booking** (prefill). |

### Finance

| Page | Path | What you do here |
|------|------|------------------|
| **Payments** | `/admin/payments` | Org-wide **payments** list (amounts, labels, dates, booking links). Milestone / customer flows. |
| **Booking payments** | `/admin/payments/booking/[bookingId]` | **Per-booking** payment view (totals, milestones, history). |
| **Invoices** | `/admin/invoices` | Invoice **list**, statuses, amounts, link to booking. **New invoice**. |
| **New invoice** | `/admin/invoices/new` | Create invoice (client, booking link, line items, due date). |
| **Invoice detail** | `/admin/invoices/[id]` | Edit status, due date, notes; **Download PDF**; **Set reminder**; **Delete**. Uses **invoice logo + business** from Settings. |
| **Reports** | `/admin/reports` | Filters + **summary** exports: bookings, revenue, conversion-style metrics (see page for current charts/tables). |
| **Season pricing** | `/admin/pricing` | **Season bands**, day overrides, pricing rules tied to calendar. Feeds **suggested total** on new booking for a date. |

### Suppliers

| Page | Path | What you do here |
|------|------|------------------|
| **Vendors** | `/admin/vendors` | Directory: type, name, contact, notes. Link vendors to **bookings** from booking workspace. |
| **New vendor** | `/admin/vendors/new` | Add supplier. |
| **Vendor detail** | `/admin/vendors/[id]` | Edit vendor. |
| **Packages** | `/admin/packages` | Catalog: name, price, line items, **`event_slot_keys`** (which slots this package allows). Links to edit. **Add package** → full page. |
| **New package** | `/admin/packages/new` | Create package (+ slot keys). |
| **Package detail** | `/admin/packages/[id]` | Edit package. |

### Team

| Page | Path | What you do here |
|------|------|------------------|
| **Audit log** | `/admin/audit-log` | **Admin only.** Who did what: enquiries, bookings, settings, PDFs, etc. **Detail** `/admin/audit-log/[id]`. |
| **Staff** | `/admin/staff` | Internal **staff** list / roles. |
| **Staff detail** | `/admin/staff/[id]` | Edit one staff member. |
| **Settings** | `/admin/settings` | **Tabs:** **Logo** (invoice PDF logo upload), **Business** (invoice address/VAT text), **Slots** (`booking_slots`: on/off, max per slot, slot keys + labels + times). Wide layout. |

---

## Website CMS (same app, separate from CRM nav)

These URLs exist for **site content** (not in the main CRM sidebar). Bookmark or link internally.

| Page | Path | What you do here |
|------|------|------------------|
| **Operations hub** | `/admin/operations` | Tile links into calendar, bookings, packages, vendors, payments, invoices, reports, enquiries. |
| **Content** | `/admin/content` | Site **copy / structured content** (API-backed). |
| **Media** | `/admin/media` | **Images / uploads** for site. |
| **Nav** | `/admin/nav` | **Header navigation** (labels & links). |
| **Footer** | `/admin/footer` | **Footer** content. |
| **Pages** | `/admin/pages` | **CMS pages** list / edit. |

---

## Public site ↔ CRM

| Public | CRM / API |
|--------|-----------|
| **`/contact`** | Calendar → **`/api/availability`**; form → **`POST /api/enquiry`** → **enquiries**. Slots → **`/api/booking-slots`**. Open dates → **`/api/availability/open-dates`**. |
| **Booking flow** | Only **admin** creates **bookings** (or API). Public does **not** auto-book without your confirmation. |

---

## Core data concepts

| Entity | Table / setting | Notes |
|--------|-----------------|--------|
| **Enquiry** | `enquiries` | Lead: optional `event_date`, `event_slot_key` (preference). |
| **Date hold** | `date_holds` | Soft pencil: `hold_date`, optional `event_slot_key`, `enquiry_id`, `expires_at`, `released_at`. |
| **Booking** | `bookings` | Confirmed event: `event_date`, `event_slot_key` or whole day, package, money, `enquiry_id`. |
| **Slots** | `site_settings` key `booking_slots` | Multi-slot mode + caps; public calendar **partial** days. |
| **Package** | `packages` | `event_slot_keys` JSON: allowed slots for that offer. |
| **Invoice** | `invoices` | Linked to booking; PDF uses Settings logo + business. |
| **Calendar block** | `venue_calendar` `is_booked` | Manually unavailable days on public calendar. |
| **Spaces** | `venue_spaces` | Optional room; holds can be per-space. |
| **Workspace** | `booking_wedding_details`, milestones, tasks, documents, communications, `booking_vendors` | All tied to **booking id**. |

---

## APIs (representative)

**Admin** (authenticated):

- Enquiries: `GET/POST /api/admin/enquiries`, `GET/PATCH /api/admin/enquiries/[id]`, export CSV/PDF.
- Holds: `GET/POST /api/admin/date-holds`, `GET/PATCH/DELETE /api/admin/date-holds/[id]`.
- Bookings: `GET/POST /api/admin/bookings`, `GET/PATCH/DELETE /api/admin/bookings/[id]`, export PDF, workspace, upload doc.
- Availability: `GET /api/admin/availability-for-date?date=&exclude_booking_id=`.
- Calendar: `GET /api/admin/calendar-month`, `calendar-day`, etc.
- Payments, invoices, packages, vendors, staff, reminders, reports (`/api/admin/reports/summary`), settings (logo, business, booking-slots), audit-log.

**Public:**

- `POST /api/enquiry`, `GET /api/availability`, `GET /api/availability/open-dates`, `GET /api/booking-slots?date=`.

---

## Migrations (CRM-relevant)

| File | Purpose |
|------|---------|
| **015** | `venue_spaces`, `date_holds`, `vendors`, `packages`, booking workspace tables, RLS. |
| **022** | `date_holds.expires_at`. |
| **028** | `bookings` / `enquiries` **`event_slot_key`**. |
| **029** | Seed **`booking_slots`**. |
| **030** | **`packages.event_slot_keys`**. |
| **031** | **`date_holds.enquiry_id`**, **`event_slot_key`**, hold indexes. |

Run all on Supabase for full behaviour (holds from enquiries, slots on packages, etc.).

---

## Typical workflows

1. **Lead → event**  
   Contact form → **Enquiries** → open lead → set date/slot → optional **hold** → **Create booking** when deposit/agreed.

2. **Direct booking**  
   **Bookings → New** → date + slot + package → save; holds on that date auto-release.

3. **Money**  
   Booking → milestones / **Payments** → **Invoices** → PDF + reminders.

4. **Ops**  
   **Calendar** for density; **Upcoming** for runway; **Reports** for revenue.

---

*Full admin surface: Dashboard, Reminders, Calendar, Bookings (+ new + detail), Upcoming, Enquiries (+ detail + holds), Payments (+ per booking), Invoices (+ new + detail), Reports, Pricing, Vendors (+ new + detail), Packages (+ new + detail), Audit log, Staff (+ detail), Settings, Operations, Content, Media, Nav, Footer, Pages.*

*Last updated: full page inventory + CRM/CMS split.*
