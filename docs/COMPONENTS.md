# Components — How they work

Overview of main components and how they fit together.

---

## Layout

- **AppShell** (`src/components/layout/AppShell.tsx`)  
  Client wrapper that holds sidebar open state. Renders Header (with optional `onMenuClick`), Sidebar, and main content. Used in root layout.

- **Header** (`src/components/layout/Header.tsx`)  
  Sticky top bar: logo, phone, “Enquire now” CTA, optional “Menu” button (opens sidebar), and hamburger for mobile. Accepts `onMenuClick?: () => void` to open the gold sidebar.

- **Sidebar** (`src/components/layout/Sidebar.tsx`)  
  Gold/bronze vertical nav (from design): Home, Weddings →, Events →, Suites →, In-House Catering, Décor, Gallery →, Testimonials, Blog, Team MG, Contact Us. Receives `isOpen` and `onClose`. Home is highlighted when pathname is `/`. Overlay closes on click.

- **Footer** (`src/components/layout/Footer.tsx`)  
  Site footer: venue name, address, phone, Explore/Links/Suites columns, copyright.

---

## Home page sections

- **Hero** — Full-width hero image, title “Welcome To A Luxury Wedding Venue Like No Other”, CTA, animated stats strip (reviews, ballrooms, capacity).
- **About** — “Welcome to The Roundhouse” text and image; “About Us” link.
- **VenueCalendar** — Month calendar; days can be “available” or “booked”. Data should come from Supabase `venue_calendar` (currently placeholder).
- **Testimonials** — Carousel of quotes with dot navigation (state: `active` index).
- **WeddingTypes** — Grid of wedding types (Asian, Turkish, Jewish, etc.) with “Discover” links.
- **Stats** — Gold strip: ballrooms, capacity, parking.
- **Catering** — In-house catering copy and “View dining” link.
- **Decor** — Décor copy and “View décor” link.
- **InstagramSection** — Grid of placeholder images (replace with `site_images` or API).
- **EnquiryForm** — Toggle-open form: function type, hear about, name, email, phone, message. Submits to Supabase `enquiries` (when wired).
- **Newsletter** — Email signup; can be wired to Supabase or mailing provider.

---

## Auth (placeholder)

- **Login** (`src/app/(auth)/login/page.tsx`) — Email/password form; to be wired to Supabase `signInWithPassword`.
- **Register** (`src/app/(auth)/register/page.tsx`) — Name, email, password; to be wired to Supabase `signUp`. Admin can then set role in `profiles`/`staff`.

---

## Admin

- **Admin layout** (`src/app/(admin)/layout.tsx`) — Sidebar nav (Dashboard, Staff, Bookings, Enquiries, Calendar, Invoices, Content), “View site”, “Sign out”. Wraps all `/admin/*` routes.
- **Dashboard** — Cards linking to each admin section.
- **Staff / Bookings / Enquiries / Calendar / Invoices / Content** — Placeholder pages; content to be loaded from Supabase and forms/actions added.

---

## Styling

- Global styles and variables: `src/app/globals.css`.  
- Sidebar colours: `--sidebar-bg` (#8b7330), `--sidebar-active` (#d1a741).  
- Form and section styles (`.form-row`, `.section-heading`, `.btn`) are in `globals.css`.

---

## Data flow (when wired)

- **Nav/sidebar** — Can be driven by `site_nav` (admin-editable).
- **Content** — Hero, about, catering, décor text from `site_content`.
- **Images** — Hero, about, gallery from `site_images` (URL or storage path).
- **Calendar** — `venue_calendar` for booked/available; admin toggles “show pricing”.
- **Enquiry form** — Insert into `enquiries`; admin sees in Enquiries (CRM).
- **Auth** — Supabase Auth; role from `profiles.role` (admin/staff/guest).

See `docs/SQL-README.md` for tables and `docs/ACCOUNTS.md` for roles.
