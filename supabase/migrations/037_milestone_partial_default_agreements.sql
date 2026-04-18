-- Allow "partial" on payment milestones (deposit partly paid, etc.)
ALTER TABLE public.booking_payment_milestones
  DROP CONSTRAINT IF EXISTS booking_payment_milestones_status_check;
ALTER TABLE public.booking_payment_milestones
  ADD CONSTRAINT booking_payment_milestones_status_check
  CHECK (status IN ('pending', 'partial', 'paid', 'refunded', 'waived'));

-- Four polished default templates (idempotent by slug)
INSERT INTO public.agreement_templates (name, slug, body, is_preferred, sort_order)
VALUES
(
  'Venue hire agreement',
  'venue-hire-default',
  E'VENUE HIRE AGREEMENT\n\nThis agreement is made between {{venueName}} ("the Venue") and {{client_name}} ("the Client"), email {{client_email}}.\n\n1. EVENT\n   Event date: {{event_date}}.\n   Venue use: {{event_slot_label}}.\n   Event type: {{event_type}}.\n   Booking reference: {{booking_code}}.\n\n2. PACKAGE & SUPPLIERS\n   Package / hire: {{package_name}}.\n   Expected guests: {{guest_count}}.\n   Linked suppliers:\n{{vendors_list}}\n\n3. FEES & SCHEDULE\n   Total agreed fee: {{total_gbp}}.\n   Deposit: {{deposit_gbp}}. Balance: {{balance_gbp}}.\n   Payment schedule:\n{{payment_schedule}}\n\n4. EXTRAS & REQUIREMENTS\n{{extras_block}}\n{{special_requirements_block}}\n\n5. USE OF THE VENUE\n   The Client shall use the Venue only for the agreed event. Access and facilities are as confirmed in writing.\n\n6. CANCELLATION\n   As per the Venue''s published terms or as agreed in writing.\n\n7. SIGNATURES\n   Client: _________________________  Date: __________\n\n   For {{venueName}}: _________________________  Date: __________\n',
  true,
  0
),
(
  'Deposit receipt & schedule',
  'deposit-schedule',
  E'DEPOSIT & PAYMENT SCHEDULE\n\n{{venueName}} · Booking {{booking_code}}\nClient: {{client_name}} ({{client_email}})\nEvent: {{event_date}} · {{event_slot_label}}\n\nDEPOSIT\nThe Client acknowledges the following deposit and payment plan.\n\nTotal hire: {{total_gbp}}\nDeposit due: {{deposit_gbp}}\nBalance: {{balance_gbp}}\n\nSchedule:\n{{payment_schedule}}\n\nThis receipt confirms the deposit terms above. Full hire agreement terms apply separately.\n\nSigned Client: _________________  Date: _______\nFor {{venueName}}: _________________  Date: _______\n',
  false,
  1
),
(
  'Final balance reminder',
  'balance-final',
  E'FINAL BALANCE — EVENT APPROACHING\n\nDear {{client_name}},\n\nYour event at {{venueName}} is scheduled for {{event_date}} ({{event_slot_label}}).\nBooking ref: {{booking_code}}.\n\nOutstanding balance: {{balance_gbp}} (total agreed {{total_gbp}}, deposit {{deposit_gbp}}).\n\nPayment schedule:\n{{payment_schedule}}\n\nPlease settle the balance by the due date on your invoice or as agreed. Contact us with any queries.\n\nYours sincerely,\n{{venueName}}\n',
  false,
  2
),
(
  'Supplier & vendor access',
  'supplier-access',
  E'SUPPLIER ACCESS — {{venueName}}\n\nBooking: {{booking_code}}\nEvent date: {{event_date}}\nClient: {{client_name}}\n\nAPPROVED SUPPLIERS / VENDORS\nThe following suppliers are linked to this booking:\n{{vendors_list}}\n\nACCESS & LOAD-IN\nSuppliers must report to venue management on arrival. Times and access routes will be confirmed before the event.\n\nThe Client remains responsible for supplier conduct and insurance as per the main hire agreement.\n\nClient: _________________  Date: _______\nVenue representative: _________________  Date: _______\n',
  false,
  3
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  body = EXCLUDED.body,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();
