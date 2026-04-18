-- Packages can be limited to specific booking time slots (e.g. morning-only package).
-- Empty array = any slot / whole day when slots are enabled.
ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS event_slot_keys JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.packages.event_slot_keys IS 'JSON array of slot keys this package is valid for. [] = all slots.';
