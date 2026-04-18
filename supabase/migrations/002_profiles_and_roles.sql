-- Profiles: one per auth user. Links Supabase Auth to app role (admin, staff, guest).
-- Used for "who is logged in" and for RLS.

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'guest' CHECK (role IN ('admin', 'staff', 'guest')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

COMMENT ON TABLE public.profiles IS 'User profiles and roles for The Roundhouse. admin = full access; staff = bookings/enquiries; guest = public only.';
