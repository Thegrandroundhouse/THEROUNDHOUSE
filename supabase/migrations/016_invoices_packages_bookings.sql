-- Invoices: snapshot fields + line items clarity
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS client_name TEXT,
  ADD COLUMN IF NOT EXISTS client_email TEXT,
  ADD COLUMN IF NOT EXISTS client_address TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS subtotal_cents INT,
  ADD COLUMN IF NOT EXISTS tax_cents INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS issued_date DATE DEFAULT CURRENT_DATE;

UPDATE public.invoices SET subtotal_cents = amount_cents WHERE subtotal_cents IS NULL;

-- Packages: priced line items [{ "label", "description", "amount_cents" }]
ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS line_items JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Bookings: optional link to catalog package
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES public.packages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_package ON public.bookings(package_id);
