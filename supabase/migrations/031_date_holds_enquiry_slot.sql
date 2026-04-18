-- Link holds to enquiries; optional time slot (whole day if null)
ALTER TABLE public.date_holds
  ADD COLUMN IF NOT EXISTS enquiry_id UUID REFERENCES public.enquiries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS event_slot_key TEXT;

COMMENT ON COLUMN public.date_holds.enquiry_id IS 'Lead this soft hold is for (admin CRM).';
COMMENT ON COLUMN public.date_holds.event_slot_key IS 'If set, hold is for this slot only; if null, whole-day soft hold for that date.';

DROP INDEX IF EXISTS date_holds_whole_venue_day;
-- One active whole-venue (full day) hold per calendar day
CREATE UNIQUE INDEX date_holds_whole_venue_day
  ON public.date_holds (hold_date)
  WHERE space_id IS NULL
    AND released_at IS NULL
    AND (event_slot_key IS NULL OR trim(event_slot_key) = '');
-- One active hold per date + slot key (multi-slot mode)
CREATE UNIQUE INDEX date_holds_venue_slot_day
  ON public.date_holds (hold_date, event_slot_key)
  WHERE space_id IS NULL
    AND released_at IS NULL
    AND event_slot_key IS NOT NULL
    AND trim(event_slot_key) <> '';
