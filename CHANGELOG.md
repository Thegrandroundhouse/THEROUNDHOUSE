# Changelog

All notable changes to The Roundhouse wedding venue website are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html) where applicable.

---

## [Unreleased]

### Added

- **Production docs** — `docs/PRODUCTION.md` (Supabase, env, deploy, register, disable register). Expanded `.env.local.example`, `docs/ACCOUNTS.md`, README.
- **Admin register hardening** — JSON/body validation, email/password limits, structured API errors (`code` + message). **`DISABLE_ADMIN_REGISTER` / `NEXT_PUBLIC_DISABLE_ADMIN_REGISTER`** closes `/register` and API after bootstrap.
- **Premium white & gold theme** — Cream/white backgrounds, gold accents, dark text; elegant look across the whole site.
- **Scroll-triggered animations** — Sections fade in on scroll for a more dynamic, premium feel (desktop and mobile).
- **Maintenance mode** — Toggle via `NEXT_PUBLIC_MAINTENANCE_MODE=1`; public sees `/maintenance`; staff sign in at **/admin-login** (hidden URL).
- **Hidden admin login** — **/admin-login** for staff only; separate from public site; sign out returns to admin-login.
- **Admin: 12 areas** — Dashboard, Staff, Bookings, Enquiries (CRM), Payments, Calendar & pricing, Invoices, Pages & content, Footer, Media (images & videos), Content & images, Settings (including maintenance).
- **Settings page** — Maintenance mode toggle (when wired to DB), site-wide options.
- **Pages & content** — Edit all page copy (home, about, catering, décor, etc.) from admin.
- **Footer management** — Edit address, phone, links, copyright from admin.
- **Media** — Upload and manage images and videos; hero, gallery, Instagram, video embeds.
- **Payments** — Track deposits, balances, payments; link to bookings/invoices; CSV export.
- **Booking system (10 features)** — Create from enquiry; event date & type; client details; package; deposit & balance; status workflow; notes; reminders; CSV export; calendar view (see TODO.md).
- **CRM** — Enquiries from form; status, notes; link to bookings and payments.
- **Migration 010** — `site_settings` table for maintenance_mode and other flags.
- **Middleware** — Redirects to `/maintenance` when maintenance mode is on (except /maintenance, /admin-login, /admin).

### Changed

- **Main page redesign** — Full premium refresh: hero with overlay, light sections, gold stats strip, rounded corners, soft shadows, improved typography and spacing.
- **Header & footer** — Header: light background, dark text, gold CTAs. Footer: dark background with gold accents for contrast.
- **Admin sidebar** — Dark theme; links to all 12 admin areas; “Sign out” goes to /admin-login.
- **Auth** — Login moved to /admin-login; /login can redirect to /admin-login for backwards compatibility.

### Added (enquiry & booking system)

- **Enquiries CRM**: List page with name, email, function, status, date; **View details** page with full contact info, message, last contact; edit **status**, **notes**, **follow-up notes**; button **Create booking from this enquiry** (pre-fills name, email, phone).
- **Bookings**: List with client, event date, package, total, deposit, status. **View details** page: edit **client name, email, phone**, **event date**, **event type**, **package name**, **status**, **total/deposit/balance** (pence), **special requirements**, **notes**; delete booking. **Create booking** page with same 10+ fields; optional link to enquiry ID (pre-filled when coming from enquiry).
- **Migration 011**: `enquiries.follow_up_notes`, `enquiries.last_contact_at`; `bookings.deposit_cents`, `bookings.balance_cents`, `bookings.special_requirements`, `bookings.package_name`.
- **Admin API routes** (service role): GET/PATCH enquiries, GET/POST/PATCH/DELETE bookings, GET/PATCH content, GET/POST/PATCH/DELETE nav, GET/POST staff, GET/PATCH/DELETE staff/[id].
- **Pages & content**: Edit site_content by key (hero_title, about_text, catering_text, decor_text, footer_address, footer_phone); Edit/Save per key.
- **Nav (header & sidebar)**: List site_nav items; Add item (label, href, order, has_children); Edit/Delete each item.
- **Staff**: List staff; Add staff (email, display name, role); Remove staff.
- **Admin UI**: Consistent tables, forms, badges, buttons (primary/ghost/danger), detail layouts; responsive; premium feel.

### Planned

- Wire Supabase auth to /admin-login; protect /admin routes.
- Wire maintenance_mode to `site_settings` in DB and toggle from Settings page.
- Staff: create password (no invite) flow from admin.
- Full CRUD for content, footer, media from admin UI.
- PDF/CSV generation for invoices and bookings.
- Stripe (or other) payment integration.

---

## [0.1.0] — (Initial)

### Added

- Initial repository and documentation setup.
- Tech stack: Next.js (latest), Node.js LTS, Supabase.
- Main page sections, sidebar, enquiry form, calendar, admin dashboard scaffold.
- SQL migrations (profiles, staff, nav, content, bookings, enquiries, invoices, images, RLS).

---

[Unreleased]: https://github.com/your-org/THEROUNDHOUSE/compare/main...HEAD
[0.1.0]: https://github.com/your-org/THEROUNDHOUSE/releases/tag/v0.1.0
