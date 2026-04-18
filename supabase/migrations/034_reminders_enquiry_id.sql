-- Link reminders to enquiries (hold follow-ups, etc.)
ALTER TABLE public.reminders
  ADD COLUMN IF NOT EXISTS enquiry_id UUID REFERENCES public.enquiries(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_reminders_enquiry ON public.reminders(enquiry_id);

COMMENT ON COLUMN public.reminders.enquiry_id IS 'Optional enquiry/lead this reminder relates to.';
