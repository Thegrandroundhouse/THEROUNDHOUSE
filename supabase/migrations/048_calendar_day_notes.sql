-- Staff notes on calendar days + optional note on manual blocks.

CREATE TABLE IF NOT EXISTS public.calendar_day_notes (
  date DATE PRIMARY KEY,
  note TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.calendar_day_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_day_notes_admin_staff"
  ON public.calendar_day_notes
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

ALTER TABLE public.venue_calendar
  ADD COLUMN IF NOT EXISTS block_note TEXT;

COMMENT ON TABLE public.calendar_day_notes IS 'Staff-only notes for a calendar date (admin UI; not shown on public site).';
COMMENT ON COLUMN public.venue_calendar.block_note IS 'Optional note when this row is a manual block (whole venue or one hall).';
