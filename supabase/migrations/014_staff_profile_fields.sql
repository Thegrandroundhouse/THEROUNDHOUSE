-- Optional profile fields for staff directory (admin UI).
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS job_title TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN public.staff.phone IS 'Contact phone (optional)';
COMMENT ON COLUMN public.staff.job_title IS 'e.g. Events Coordinator';
COMMENT ON COLUMN public.staff.notes IS 'Internal notes (optional)';
