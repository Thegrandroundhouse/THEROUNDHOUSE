-- Public trading name and contact email (Settings → Business & bank display fields).

UPDATE public.site_settings
SET
  value = jsonb_set(
    jsonb_set(
      COALESCE(value, '{}'::jsonb),
      '{venueName}',
      to_jsonb('The Grand Round House'::text),
      true
    ),
    '{venueEmail}',
    to_jsonb('info@thegrandroundhouse.co.uk'::text),
    true
  ),
  updated_at = now()
WHERE key = 'invoice_business'
  AND (
    COALESCE(value->>'venueName', '') IN (
      '',
      'The Grand Roundhouse',
      'The Roundhouse',
      'The Roundhouse Banqueting Limited'
    )
    OR COALESCE(value->>'venueEmail', '') IN ('', 'events@theroundhouse.co.uk')
  );
