-- Per-day price overrides (overrides season band for that date)
CREATE TABLE IF NOT EXISTS public.venue_day_pricing (
  event_date DATE PRIMARY KEY,
  suggested_total_cents INT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.venue_day_pricing ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "venue_day_pricing_admin" ON public.venue_day_pricing FOR ALL
    USING (public.current_user_role() IN ('admin', 'staff'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON TABLE public.venue_day_pricing IS 'Override suggested total for specific dates; used when creating bookings.';
