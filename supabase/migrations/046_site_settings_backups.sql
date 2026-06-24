-- Version history for site_settings (hire contract defaults, etc.) — restore from admin UI.

CREATE TABLE IF NOT EXISTS public.site_settings_backups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key TEXT NOT NULL,
  value JSONB NOT NULL,
  label TEXT,
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_settings_backups_key_created
  ON public.site_settings_backups (setting_key, created_at DESC);

ALTER TABLE public.site_settings_backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_settings_backups_admin_staff"
  ON public.site_settings_backups
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

COMMENT ON TABLE public.site_settings_backups IS 'Snapshots of site_settings values for restore (e.g. hire contract PDF defaults).';
