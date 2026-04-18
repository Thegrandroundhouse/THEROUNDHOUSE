-- Site images: slot/key (hero, about, gallery_1, ...) and URL or storage path. Admin can change without code.

CREATE TABLE IF NOT EXISTS public.site_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  url TEXT,
  storage_path TEXT,
  alt_text TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_images_key ON public.site_images(key);

COMMENT ON TABLE public.site_images IS 'Image slots for hero, about, catering, décor, gallery, Instagram. Admin sets url or storage_path.';
