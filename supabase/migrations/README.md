# migrations — SQL migrations

SQL migrations for Supabase (schema, RLS, functions).

## Naming

- Format: `YYYYMMDDHHMMSS_short_description.sql`
- Example: `20250117120000_create_profiles_and_bookings.sql`

## Suggested order

1. `profiles` (id, user_id, role, display_name, etc.).
2. `venue_availability` or `availability` (date, slot, is_available, etc.).
3. `bookings` (id, user_id, date, status, details, created_at, etc.).
4. RLS policies for each table (public read for availability; admin/staff for bookings; admin for settings).
5. Triggers/functions if needed (e.g. create profile on signup).

Run via Supabase Dashboard SQL editor or `supabase db push` (Supabase CLI).
