-- Extend enquiries: follow-up tracking and last contact
ALTER TABLE public.enquiries
  ADD COLUMN IF NOT EXISTS follow_up_notes TEXT,
  ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMPTZ;

COMMENT ON COLUMN public.enquiries.follow_up_notes IS 'CRM: follow-up history and notes.';
COMMENT ON COLUMN public.enquiries.last_contact_at IS 'Last time staff contacted this enquiry.';

-- Extend bookings: deposit, balance, special requirements, package
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS deposit_cents INT,
  ADD COLUMN IF NOT EXISTS balance_cents INT,
  ADD COLUMN IF NOT EXISTS special_requirements TEXT,
  ADD COLUMN IF NOT EXISTS package_name TEXT;

COMMENT ON COLUMN public.bookings.deposit_cents IS 'Deposit paid in pence.';
COMMENT ON COLUMN public.bookings.balance_cents IS 'Balance due in pence.';
COMMENT ON COLUMN public.bookings.special_requirements IS 'Catering, deliveries, access, etc.';
COMMENT ON COLUMN public.bookings.package_name IS 'Package or tier name.';
