-- Preferred business details for invoices (The Grand Round House): address, phone, email, bank details for payment.
INSERT INTO public.site_settings (key, value, updated_at)
VALUES (
  'invoice_business',
  '{
    "venueName": "The Grand Round House",
    "venueTagline": "Wedding & events venue",
    "venueAddress": "",
    "venuePhone": "",
    "venueEmail": "",
    "bankName": "",
    "sortCode": "",
    "accountNumber": "",
    "accountName": "",
    "paymentReference": "Invoice number"
  }'::jsonb,
  now()
)
ON CONFLICT (key) DO NOTHING;
