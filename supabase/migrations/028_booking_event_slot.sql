-- Time slot per booking (morning / afternoon / etc.) for multi-event-per-day capacity.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS event_slot_key TEXT;

COMMENT ON COLUMN public.bookings.event_slot_key IS 'Which time slot this booking uses (e.g. morning). NULL = whole-day booking (blocks all slots).';

ALTER TABLE public.enquiries
  ADD COLUMN IF NOT EXISTS event_slot_key TEXT;

COMMENT ON COLUMN public.enquiries.event_slot_key IS 'Preferred time slot from contact form enquiry.';
