-- Client postal address on bookings (prefills hire contract PDF).

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS client_address TEXT;

COMMENT ON COLUMN public.bookings.client_address IS 'Client address — prefills contract PDF and can be edited before generating.';
