-- Rename hire contract / T&C templates and business settings to The Grand Round House.

UPDATE public.agreement_templates
SET
  name = 'The Grand Round House — Hire contract',
  body = REPLACE(COALESCE(body, ''), 'Roundhouse Banqueting', 'The Grand Round House'),
  updated_at = now()
WHERE slug = 'banqueting-hire-contract';

UPDATE public.agreement_templates
SET
  name = 'The Grand Round House — Terms & Conditions',
  body = REPLACE(
    REPLACE(COALESCE(body, ''), 'The Roundhouse Banqueting Limited', 'The Grand Round House'),
    'Roundhouse Banqueting',
    'The Grand Round House'
  ),
  updated_at = now()
WHERE slug = 'banqueting-terms-conditions';

UPDATE public.site_settings
SET
  value = jsonb_set(
    jsonb_set(
      COALESCE(value, '{}'::jsonb),
      '{venueName}',
      to_jsonb('The Grand Round House'::text),
      true
    ),
    '{accountName}',
    to_jsonb('The Grand Round House'::text),
    true
  ),
  updated_at = now()
WHERE key = 'invoice_business'
  AND (
    COALESCE(value->>'venueName', '') IN (
      'The Roundhouse Banqueting Limited',
      'The Grand Roundhouse',
      'The Roundhouse'
    )
    OR COALESCE(value->>'accountName', '') IN (
      '',
      'The Roundhouse Banqueting Limited',
      'The Grand Roundhouse',
      'The Roundhouse'
    )
  );
