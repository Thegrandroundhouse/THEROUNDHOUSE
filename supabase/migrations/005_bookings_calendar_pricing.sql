-- Calendar: which dates are booked. Pricing per day (optional). Bookings with status and client.

CREATE TABLE IF NOT EXISTS public.venue_calendar (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL UNIQUE,
  is_booked BOOLEAN NOT NULL DEFAULT false,
  booking_id UUID,
  show_pricing BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- booking_id FK added after bookings table exists (below)

CREATE TABLE IF NOT EXISTS public.pricing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE,
  date_from DATE,
  date_to DATE,
  amount_cents INT NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pricing_date_or_range CHECK (
    (date IS NOT NULL AND date_from IS NULL AND date_to IS NULL) OR
    (date IS NULL AND date_from IS NOT NULL AND date_to IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_venue_calendar_date ON public.venue_calendar(date);
CREATE INDEX IF NOT EXISTS idx_pricing_date ON public.pricing(date);
CREATE INDEX IF NOT EXISTS idx_pricing_range ON public.pricing(date_from, date_to);

CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enquiry_id UUID,
  client_name TEXT,
  client_email TEXT NOT NULL,
  client_phone TEXT,
  event_date DATE NOT NULL,
  event_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  total_cents INT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_event_date ON public.bookings(event_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);

-- Optional: link calendar to booking
ALTER TABLE public.venue_calendar
  ADD CONSTRAINT fk_booking
  FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE SET NULL;

COMMENT ON TABLE public.venue_calendar IS 'Per-date availability. is_booked and optional booking_id. show_pricing controlled by admin.';
COMMENT ON TABLE public.pricing IS 'Price per day or date range. Used for PDF/CSV and admin pricing toggle.';
COMMENT ON TABLE public.bookings IS 'Confirmed or pending venue bookings. Linked to enquiries and invoices.';
