# The Grand Roundhouse — Wedding Venue Website

A full-stack wedding venue website for **The Grand Roundhouse**, with a venue availability calendar, booking management, and admin/staff dashboards. Stack: **Next.js**, **Node.js**, **Supabase** (Auth, Postgres, Storage).

---

## Tech stack

| Layer      | Technology | Recommended version |
|-----------|------------|----------------------|
| Frontend  | Next.js (React) | **16.x** (or latest) |
| Runtime   | Node.js    | **24.x LTS** (or 22.x LTS) |
| Backend   | Supabase   | Cloud (Auth, DB, Storage, Edge) |
| Package manager | npm   | 10+ (shipped with Node.js) |

Use the latest stable versions when you install. Check [Next.js releases](https://github.com/vercel/next.js/releases), [Node.js releases](https://nodejs.org/en/about/releases/), and [Supabase JS](https://www.npmjs.com/package/@supabase/supabase-js) for current versions.

---

## Features

- **Premium design** — White & gold theme; elegant typography; scroll-triggered animations; mobile-responsive layout.
- **Public site**: Wedding/venue info, gallery, contact, **gold sidebar** (Home, Weddings, Events, Suites, Catering, Décor, Gallery, Testimonials, Blog, Team MG, Contact).
- **Venue calendar**: Main page — which days are booked/available.
- **Enquiry form**: Submits to Supabase **enquiries** → admin **CRM**.
- **Maintenance mode**: Set `NEXT_PUBLIC_MAINTENANCE_MODE=1`; public sees maintenance page; staff sign in at **/admin-login** (hidden URL).
- **Admin (12 areas)**: Dashboard, Staff, Bookings, Enquiries (CRM), Payments, Calendar & pricing, Invoices, **Pages & content**, **Footer**, **Media (images & videos)**, Content & images, **Settings** (maintenance toggle). Manage the whole site from admin.
- **Booking system**: Create from enquiry; event date/type; client; package; deposit/balance; status; notes; reminders; CSV; calendar.
- **Admin staff**: Add/edit/delete staff; create password (no invite); roles via **profiles**.

---

## Repository structure

```
THEROUNDHOUSE/
├── README.md
├── CHANGELOG.md
├── package.json
├── .env.local.example
├── src/                      # app/, components/, lib/, hooks/, types/
├── supabase/                 # migrations/, seed.sql
├── docs/                     # PRODUCTION.md, setup guides
│   ├── PRODUCTION.md         # Deploy, Supabase, register / disable register
│   ├── SQL-README.md
│   ├── ACCOUNTS.md
│   ├── SECURITY.md
│   └── …
│
└── scripts/                  # Build, deploy, or DB scripts
    └── README.md
```

See **`docs/`** (especially **`docs/PRODUCTION.md`**) for deploy and env setup.

**Repo:** `.gitignore` excludes `.env.local`, build output, and common local tool folders so only source and config meant for the team are committed.

---

## Prerequisites

- **Node.js** 22.x or 24.x LTS ([nodejs.org](https://nodejs.org)).
- **npm** 10+ (comes with Node.js).
- **Supabase** account ([supabase.com](https://supabase.com)).

---

## Quick start

### 1. Clone and install

```bash
git clone <repository-url>
cd THEROUNDHOUSE
npm install
```

### 2. Environment variables

```bash
cp .env.local.example .env.local
```

See **`.env.local.example`** for every variable. Minimum:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only — never expose |
| `ADMIN_SETUP_KEY` | 8+ chars — unlocks **first admin** at `/register` |

Optional: `NEXT_PUBLIC_MAINTENANCE_MODE=1` (maintenance page; staff use **/admin-login**).

**Production:** after the first admin, set **`DISABLE_ADMIN_REGISTER=1`** and **`NEXT_PUBLIC_DISABLE_ADMIN_REGISTER=1`** so `/register` and the API no longer create admins. See **`docs/PRODUCTION.md`**.

### 3. Supabase setup

1. New project → **API** keys into `.env.local`.
2. **Authentication → Providers** → Email on.
3. Run all SQL in **`supabase/migrations/`** in order (`docs/SQL-README.md`).
4. Roles come from **`profiles`** (migrations + triggers); no manual “create role” in dashboard.

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**First admin (step-by-step):** You choose the setup key. (1) Add to `.env.local`: `ADMIN_SETUP_KEY=yourSecretKey2024` (use any secret, 8+ chars). (2) Restart dev server. (3) Go to /register and enter the same value in the "Admin setup key" field. **First admin (detailed):** Set `ADMIN_SETUP_KEY` in `.env.local` (e.g. a long random string), then go to **[http://localhost:3000/register](http://localhost:3000/register)**. Enter email, password, display name, and the same value as `ADMIN_SETUP_KEY` in “Admin setup key”. Submit to create the first admin, then sign in at **/login** or **/admin-login**.

**Admin / staff sign-in**: **[http://localhost:3000/login](http://localhost:3000/login)** or **[http://localhost:3000/admin-login](http://localhost:3000/admin-login)** (hidden URL), then open `/admin`.

**Staff**: Once signed in as admin, go to **Admin → Staff** to add more staff or admins (email, password, role). They sign in at **/admin-login**.

**Maintenance**: Set `NEXT_PUBLIC_MAINTENANCE_MODE=1` in `.env.local` and restart; only `/maintenance` and `/admin-login` (and `/admin` when signed in) remain available to the public.

---

## Scripts

| Command         | Description                |
|----------------|----------------------------|
| `npm run dev`  | Start Next.js dev server   |
| `npm run build`| Production build           |
| `npm run start`| Run production server      |
| `npm run lint` | Run ESLint                 |

---

## Admin and staff

- **First admin**: Create via **[ /register ](/register)** using the **Admin setup key** (`ADMIN_SETUP_KEY` in `.env.local`). This is the only way to create an admin when no one is logged in.
- **More staff or admins**: Once an admin exists, sign in and go to **Admin → Staff**. Use “+ Add staff” to create new accounts (email, password, role: admin or staff). New users sign in at **/admin-login**.
- **Admin**: Full access to bookings, calendar, staff, and site settings (enforced via Supabase RLS and `profiles.role`).
- **Staff**: Access to bookings, enquiries, calendar, etc.; audit log and some settings may be admin-only.
- Roles are stored in the `profiles` table (`role: 'admin' | 'staff' | 'guest'`) and enforced in API routes and the admin UI.

---

## Documentation

- **`docs/PRODUCTION.md`** — **Deploy checklist**: Supabase, env, first admin, **disable `/register`**, errors, maintenance.
- **SQL**: **`docs/SQL-README.md`**
- **Accounts**: **`docs/ACCOUNTS.md`**
- **Security**: **`docs/SECURITY.md`**
- **Components / images**: **`docs/COMPONENTS.md`**, **`docs/SETUP-IMAGES.md`**
- **Root**: `CHANGELOG.md`, `TODO.md`

---

## License

Private / All rights reserved (or add your chosen license).

---

**The Grand Roundhouse** — Wedding venue website. Next.js + Node.js + Supabase.
