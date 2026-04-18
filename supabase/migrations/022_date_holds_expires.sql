-- Hold expiry: optional expires_at so holds can auto-expire after a set time
ALTER TABLE public.date_holds
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

COMMENT ON COLUMN public.date_holds.expires_at IS 'When set, the hold is time-limited; after this time the hold is considered expired (release or show as lapsed).';
