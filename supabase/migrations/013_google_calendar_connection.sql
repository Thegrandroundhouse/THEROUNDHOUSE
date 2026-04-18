-- Singleton row: Google Calendar OAuth refresh token (server-only via service role).
-- Never exposed to client; RLS blocks anon/authenticated SELECT.
CREATE TABLE IF NOT EXISTS public.google_calendar_connection (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  refresh_token TEXT NOT NULL,
  calendar_id TEXT NOT NULL DEFAULT 'primary',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.google_calendar_connection ENABLE ROW LEVEL SECURITY;

-- No policies: only service_role bypasses RLS.

COMMENT ON TABLE public.google_calendar_connection IS 'Google Calendar OAuth (offline refresh token). Managed by admin OAuth flow.';
