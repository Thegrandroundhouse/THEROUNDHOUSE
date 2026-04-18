-- Internal comments/notes on invoices (not shown on PDF)
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;

COMMENT ON COLUMN public.invoices.admin_notes IS 'Internal notes/comments; not printed on PDF.';
