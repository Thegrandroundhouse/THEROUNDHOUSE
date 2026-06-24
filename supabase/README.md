# supabase — Backend configuration

Supabase project configuration, migrations, and seed data for The Grand Round House.

## Structure

- **`migrations/`** — SQL migrations: tables (profiles, bookings, availability, etc.), RLS policies, indexes, triggers.
- **`seed.sql`** — Optional seed data for local or staging (e.g. test admin, sample availability).
- **`config.toml`** — Optional; used by Supabase CLI for local development.

## Conventions

- One logical change per migration file; name with timestamp and short description (e.g. `20250101000000_create_bookings.sql`).
- Use Row Level Security (RLS) on all user-facing tables; restrict by `auth.uid()` and role (e.g. from `profiles.role`).
- Document admin vs staff permissions in migration comments or in `docs/`.
