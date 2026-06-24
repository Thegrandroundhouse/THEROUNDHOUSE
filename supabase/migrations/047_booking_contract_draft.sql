-- Per-booking hire contract configuration (Configure panel) + version history.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS hire_contract_draft JSONB,
  ADD COLUMN IF NOT EXISTS hire_contract_draft_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.bookings.hire_contract_draft IS 'Saved hire contract PDF configuration for this booking (before Generate PDF).';
COMMENT ON COLUMN public.bookings.hire_contract_draft_updated_at IS 'When hire_contract_draft was last saved.';

CREATE TABLE IF NOT EXISTS public.booking_contract_draft_backups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  value JSONB NOT NULL,
  label TEXT,
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_contract_draft_backups_booking_created
  ON public.booking_contract_draft_backups (booking_id, created_at DESC);

ALTER TABLE public.booking_contract_draft_backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "booking_contract_draft_backups_admin_staff"
  ON public.booking_contract_draft_backups
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

COMMENT ON TABLE public.booking_contract_draft_backups IS 'Snapshots of bookings.hire_contract_draft for restore per booking.';
