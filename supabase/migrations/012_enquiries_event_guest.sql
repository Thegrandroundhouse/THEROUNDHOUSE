-- Enquiry form: event date and guest count for hero enquiry strip
ALTER TABLE public.enquiries
  ADD COLUMN IF NOT EXISTS event_date DATE,
  ADD COLUMN IF NOT EXISTS guest_count INT;

COMMENT ON COLUMN public.enquiries.event_date IS 'Preferred event date from enquiry form.';
COMMENT ON COLUMN public.enquiries.guest_count IS 'Number of guests from enquiry form.';
