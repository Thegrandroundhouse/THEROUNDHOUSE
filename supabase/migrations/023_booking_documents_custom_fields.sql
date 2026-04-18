-- Add custom_fields to booking_documents for flexible metadata (e.g. "Signed", "Version", "Notes")
ALTER TABLE public.booking_documents
  ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';

COMMENT ON COLUMN public.booking_documents.custom_fields IS 'Optional key-value metadata (e.g. {"signed": "yes", "version": "1.0"})';
