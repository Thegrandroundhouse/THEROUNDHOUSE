-- Default two main halls (rename or add more in Settings → Halls).

INSERT INTO public.venue_spaces (name, slug, capacity, sort_order)
VALUES
  ('Hall One', 'hall-one', 300, 1),
  ('Hall Two', 'hall-two', 300, 2)
ON CONFLICT (slug) DO NOTHING;
