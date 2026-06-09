-- Roundhouse Banqueting hire contract + T&C library templates (PDF generated from structured booking data).
-- Full bodies are synced from app code via ensureBanquetingTemplates(); slugs must match BANQUETING_* in roundhouse-contract-types.ts.

INSERT INTO public.agreement_templates (name, slug, body, is_preferred, sort_order, updated_at)
VALUES (
  'Roundhouse Banqueting — Hire contract',
  'banqueting-hire-contract',
  'Structured hire contract — use Generate on a booking. PDF layout matches official Roundhouse contract pack.',
  true,
  0,
  now()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  is_preferred = EXCLUDED.is_preferred,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

INSERT INTO public.agreement_templates (name, slug, body, is_preferred, sort_order, updated_at)
VALUES (
  'Roundhouse Banqueting — Terms & Conditions',
  'banqueting-terms-conditions',
  'Full Terms & Conditions — appended to hire contracts when "Include T&C" is checked, or generated standalone.',
  false,
  1,
  now()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- Prefer banqueting hire over legacy venue-hire-default for new bookings
UPDATE public.agreement_templates SET is_preferred = false WHERE slug = 'venue-hire-default';
