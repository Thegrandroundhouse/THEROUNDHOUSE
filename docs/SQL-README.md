# SQL & Database — The Roundhouse

This document describes every SQL migration file, what each table is for, and how to run them.

---

## How to run migrations

1. **Supabase Dashboard**: Project → SQL Editor → paste each file in order → Run.
2. **Supabase CLI** (optional): `supabase db push` from project root (requires `supabase link`).

Run files in **numeric order** (001, 002, …). Do not skip files.

---

## Migration files and what they do

| File | Purpose |
|------|--------|
| `001_extensions.sql` | Enables Postgres extensions (e.g. `uuid-ossp`, `pgcrypto`) if needed. |
| `002_profiles_and_roles.sql` | **profiles** table: links Supabase Auth users to app data (display name, role: admin/staff/guest). Used for “who is logged in” and permissions. |
| `003_staff_and_auth.sql` | **staff** table: extended staff info (invite code, status). Optional trigger to create a profile when a user signs up. |
| `004_site_nav_and_content.sql` | **site_nav** (sidebar/menu items, order, has_children, link). **site_content** (key-value or section-based text for homepage, about, catering, etc.). Admin edits these so you don’t change code for copy/links. |
| `005_bookings_calendar_pricing.sql` | **venue_dates** or **calendar**: which dates are blocked/booked. **pricing** (price per day or date range, optional “show pricing” flag for admin). **bookings** (event date, status, client ref, notes). |
| `006_enquiries_crm.sql` | **enquiries** table: form submissions (name, email, phone, function type, message, source). This is the CRM feed from the main-page enquiry form. |
| `007_invoices.sql` | **invoices** table: link to booking, amount, due date, status, line items (optional). Used for PDF generation and CSV export. |
| `008_images_and_gallery.sql` | **site_images** (slot/key e.g. hero, about, gallery_1, Instagram URL) and optional **gallery** for multiple images. Admin can change URLs or use Storage paths. |
| `009_rls_policies.sql` | Row Level Security: who can read/write each table. |
| `010_site_settings.sql` | **site_settings** table: key-value (e.g. `maintenance_mode`). Admin toggles from Settings; middleware or API can read to show maintenance page. |
| `011_enquiries_bookings_extended.sql` | **enquiries**: adds `follow_up_notes`, `last_contact_at`. **bookings**: adds `deposit_cents`, `balance_cents`, `special_requirements`, `package_name`. |

---

## Tables summary

| Table | What it’s for |
|-------|----------------|
| **profiles** | User profile + role (admin/staff/guest). One per auth user. |
| **staff** | Extra staff fields (e.g. invite code, active). |
| **site_nav** | Sidebar/main nav items (label, href, order, has_children). Admin manages menu. |
| **site_content** | Editable text blocks (hero title, about, catering, décor, testimonials, etc.). |
| **venue_calendar** / **bookings** | Which days are booked; booking record (client, date, status). |
| **pricing** | Price per date or range; admin toggle “show pricing”. |
| **enquiries** | Enquiry form submissions → CRM list in admin. |
| **invoices** | Invoices linked to bookings; for PDF and CSV. |
| **site_images** | Keys (hero, about, gallery, Instagram) and URL or path. Admin changes images here. |
| **site_settings** | Key-value (e.g. maintenance_mode). Used by Settings page and optionally by middleware/API. |

---

## Accounts and roles

- **admin**: Full access — staff CRUD, bookings, invoices, content, nav, images, pricing, calendar.
- **staff**: Can manage bookings, enquiries, calendar view; may be restricted from staff CRUD and site content (depending on RLS).
- **guest**: No dashboard; public site only.

Role is stored in **profiles.role**. RLS policies in `009_rls_policies.sql` enforce who can read/write each table.

---

## Enquiry form → CRM

1. User submits the main-page enquiry form.
2. App inserts a row into **enquiries** (name, email, phone, function_type, message, source, created_at).
3. Admin dashboard “CRM” or “Enquiries” page reads from **enquiries** (filter, search, status, notes).
4. Optional: add **status** and **notes** columns to **enquiries** for follow-up.

---

## Images and where to change them

- **Via admin**: If you use **site_images**, admin UI lets you set URL or upload (Supabase Storage) per slot (hero, about, gallery_1, etc.). Frontend reads from this table.
- **Via code**: See `docs/SETUP-IMAGES.md` for file paths and env vars for hero, about, gallery, and Instagram placeholders.

All migration files live in `supabase/migrations/`. Keep this README updated when adding new migrations.
