INSERT INTO public.site_settings (key, value, updated_at)
VALUES (
  'booking_slots',
  '{
    "enabled": true,
    "maxPerSlot": 1,
    "allowWholeDay": true,
    "wholeDayLabel": "Full venue (whole day) — blocks every other slot on this date.",
    "slots": [
      {"key": "morning", "label": "Morning", "timeLabel": "9:00 – 12:00"},
      {"key": "afternoon", "label": "Afternoon", "timeLabel": "12:00 – 17:00"},
      {"key": "evening", "label": "Evening", "timeLabel": "17:00 – 22:00"},
      {"key": "night", "label": "Night", "timeLabel": "22:00 – 02:00"}
    ]
  }'::jsonb,
  now()
)
ON CONFLICT (key) DO NOTHING;
