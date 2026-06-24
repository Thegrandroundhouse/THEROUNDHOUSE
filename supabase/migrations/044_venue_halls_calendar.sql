-- Per-hall calendar blocks + booking ↔ hall links (multi-hall venue).

ALTER TABLE public.venue_calendar DROP CONSTRAINT IF EXISTS venue_calendar_date_key;

ALTER TABLE public.venue_calendar
  ADD COLUMN IF NOT EXISTS space_id UUID REFERENCES public.venue_spaces(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS venue_calendar_whole_venue_day
  ON public.venue_calendar (date)
  WHERE space_id IS NULL AND booking_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS venue_calendar_hall_day
  ON public.venue_calendar (date, space_id)
  WHERE space_id IS NOT NULL AND booking_id IS NULL;

CREATE TABLE IF NOT EXISTS public.booking_spaces (
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES public.venue_spaces(id) ON DELETE RESTRICT,
  PRIMARY KEY (booking_id, space_id)
);

CREATE INDEX IF NOT EXISTS idx_booking_spaces_space ON public.booking_spaces(space_id);

INSERT INTO public.booking_spaces (booking_id, space_id)
SELECT id, space_id FROM public.bookings WHERE space_id IS NOT NULL
ON CONFLICT DO NOTHING;

ALTER TABLE public.enquiries
  ADD COLUMN IF NOT EXISTS preferred_space_ids UUID[];

COMMENT ON COLUMN public.venue_calendar.space_id IS 'NULL = whole venue blocked; set = one hall blocked for that date.';
COMMENT ON TABLE public.booking_spaces IS 'Halls reserved by a booking (one row per hall). Empty = legacy whole-venue booking.';
