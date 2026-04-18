-- Site nav: sidebar/menu items (label, href, order, has_children). Admin manages from dashboard.
-- Site content: editable text blocks for homepage (hero, about, catering, décor, etc.).

CREATE TABLE IF NOT EXISTS public.site_nav (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label TEXT NOT NULL,
  href TEXT NOT NULL DEFAULT '#',
  sort_order INT NOT NULL DEFAULT 0,
  has_children BOOLEAN NOT NULL DEFAULT false,
  parent_id UUID REFERENCES public.site_nav(id) ON DELETE SET NULL,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_nav_sort ON public.site_nav(sort_order);

CREATE TABLE IF NOT EXISTS public.site_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  value_json JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.site_nav IS 'Sidebar/main nav items. Admin can add, reorder, set links and has_children.';
COMMENT ON TABLE public.site_content IS 'Editable copy: hero_title, about_text, catering_text, instagram_url, etc.';
