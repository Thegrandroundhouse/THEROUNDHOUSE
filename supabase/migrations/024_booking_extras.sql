-- Optional freeform extras / add-ons for a booking (e.g. "Extra hour £200", "Cake stand")
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS extras TEXT;

COMMENT ON COLUMN public.bookings.extras IS 'Freeform add-ons or extra items for this booking.';
