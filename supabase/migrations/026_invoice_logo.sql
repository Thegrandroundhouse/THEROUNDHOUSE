-- Invoice logo: per-invoice logo_url and site-wide preferred logo for PDFs.
-- Logo files are stored in Storage bucket "invoice-logos" (created automatically on first upload).
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

COMMENT ON COLUMN public.invoices.logo_url IS 'Optional logo URL for this invoice PDF. If null, preferred logo from site_settings is used.';

INSERT INTO public.site_settings (key, value, updated_at)
VALUES ('invoice_logo_url', 'null'::jsonb, now())
ON CONFLICT (key) DO NOTHING;
