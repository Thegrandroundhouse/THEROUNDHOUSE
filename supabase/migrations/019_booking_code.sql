-- Unique 10-char booking code (TGRH-XXXXX) for linking from payments, invoices, vendors.

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS booking_code TEXT UNIQUE;

COMMENT ON COLUMN public.bookings.booking_code IS 'Short code for refs: TGRH- + 5 alphanumeric (e.g. TGRH-A1B2C).';

-- Backfill: TGRH- + 5 chars from UUID (no dashes) = unique per booking
UPDATE public.bookings
SET booking_code = 'TGRH-' || upper(substr(replace(id::text, '-', ''), 1, 5))
WHERE booking_code IS NULL;
