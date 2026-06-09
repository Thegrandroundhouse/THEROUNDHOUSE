-- Correct venue registered address (replaces legacy North London / Advent Way placeholders in settings).

UPDATE public.site_settings
SET
  value = jsonb_set(
    jsonb_set(
      COALESCE(value, '{}'::jsonb),
      '{venueAddress}',
      to_jsonb('Lodge Avenue, Dagenham, RM8 2HY'::text),
      true
    ),
    '{venueName}',
    to_jsonb('The Roundhouse Banqueting Limited'::text),
    true
  ),
  updated_at = now()
WHERE key = 'invoice_business'
  AND (
    COALESCE(value->>'venueAddress', '') = ''
    OR value->>'venueAddress' ILIKE '%Advent%'
    OR value->>'venueAddress' ILIKE '%N18%'
    OR value->>'venueAddress' ILIKE '%Eley%'
    OR value->>'venueAddress' ILIKE '%North London%'
  );

-- Seed row if missing (fresh installs after 027)
INSERT INTO public.site_settings (key, value, updated_at)
VALUES (
  'invoice_business',
  '{
    "venueName": "The Roundhouse Banqueting Limited",
    "venueTagline": "Wedding & events venue",
    "venueAddress": "Lodge Avenue, Dagenham, RM8 2HY",
    "venuePhone": "",
    "venueEmail": "",
    "bankName": "",
    "sortCode": "",
    "accountNumber": "",
    "accountName": "The Roundhouse Banqueting Limited",
    "paymentReference": "Invoice number"
  }'::jsonb,
  now()
)
ON CONFLICT (key) DO NOTHING;

-- Fix editable site copy that still references the old North London / Advent Way address.
UPDATE public.site_content
SET
  value = REPLACE(value, 'North London', 'Dagenham, Essex'),
  updated_at = now()
WHERE key = 'about_text'
  AND value ILIKE '%North London%';

UPDATE public.site_content
SET
  value = 'Lodge Avenue, Dagenham, RM8 2HY',
  updated_at = now()
WHERE key = 'footer_address'
  AND (
    COALESCE(value, '') = ''
    OR value ILIKE '%North London%'
    OR value ILIKE '%Advent%'
    OR value ILIKE '%N18%'
    OR value ILIKE '%Eley%'
  );
