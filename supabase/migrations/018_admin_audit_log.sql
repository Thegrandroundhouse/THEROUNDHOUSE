-- Immutable admin audit trail (written via service role from API). Readable by admins only in app.

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_user_id UUID,
  actor_email TEXT,
  actor_display_name TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  summary TEXT NOT NULL DEFAULT '',
  payload_before JSONB,
  payload_after JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON public.admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_booking ON public.admin_audit_log (booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_admin_audit_entity ON public.admin_audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_actor ON public.admin_audit_log (actor_user_id);

COMMENT ON TABLE public.admin_audit_log IS 'Who changed what; admin-only reads via API.';

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_audit_no_client" ON public.admin_audit_log;
CREATE POLICY "admin_audit_no_client" ON public.admin_audit_log FOR ALL USING (false);
