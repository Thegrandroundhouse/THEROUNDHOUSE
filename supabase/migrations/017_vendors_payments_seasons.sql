-- Vendors: trade vs customer pricing + arbitrary custom fields
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS trade_price_cents INT,
  ADD COLUMN IF NOT EXISTS customer_price_cents INT,
  ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Ledger: who paid whom (customer → venue, venue → vendor, etc.)
CREATE TABLE IF NOT EXISTS public.payment_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  flow TEXT NOT NULL DEFAULT 'customer_in' CHECK (flow IN (
    'customer_in',
    'vendor_out',
    'vendor_in',
    'adjustment'
  )),
  amount_cents INT NOT NULL,
  label TEXT NOT NULL DEFAULT 'Payment',
  notes TEXT,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payment_records_booking ON public.payment_records(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_paid_at ON public.payment_records(paid_at DESC);

-- Season / date-band pricing (create booking uses matching band for suggested total)
CREATE TABLE IF NOT EXISTS public.venue_season_pricing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  date_start DATE NOT NULL,
  date_end DATE NOT NULL,
  suggested_total_cents INT,
  note TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_season_dates ON public.venue_season_pricing(date_start, date_end);

ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_season_pricing ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "payment_records_admin" ON public.payment_records FOR ALL
    USING (public.current_user_role() IN ('admin', 'staff'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "venue_season_admin" ON public.venue_season_pricing FOR ALL
    USING (public.current_user_role() IN ('admin', 'staff'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
