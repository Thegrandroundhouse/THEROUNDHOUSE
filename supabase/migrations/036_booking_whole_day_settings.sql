-- Full venue / whole day: stored as bookings.event_slot_key IS NULL (see 028).
COMMENT ON COLUMN public.bookings.event_slot_key IS
  'Time slot key (e.g. morning). NULL = full venue / whole day for that date (blocks all slots).';

-- Legacy site_settings rows may omit allowWholeDay / wholeDayLabel; app defaults them, but persist for clarity.
UPDATE public.site_settings
SET value =
  value
  || CASE WHEN (value ? 'allowWholeDay') THEN '{}'::jsonb ELSE '{"allowWholeDay": true}'::jsonb END
  || CASE
      WHEN (value ? 'wholeDayLabel') AND btrim(COALESCE(value->>'wholeDayLabel', '')) <> ''
      THEN '{}'::jsonb
      ELSE '{"wholeDayLabel": "Full venue (whole day) — blocks every other slot on this date."}'::jsonb
    END
WHERE key = 'booking_slots';
