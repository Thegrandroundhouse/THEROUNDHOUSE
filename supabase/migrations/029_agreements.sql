-- Agreement templates + per-booking instances (print / sign)
CREATE TABLE IF NOT EXISTS public.agreement_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  body TEXT NOT NULL DEFAULT '',
  custom_fields JSONB NOT NULL DEFAULT '[]',
  is_preferred BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.booking_agreements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.agreement_templates(id) ON DELETE SET NULL,
  title TEXT,
  rendered_body TEXT NOT NULL DEFAULT '',
  custom_values JSONB NOT NULL DEFAULT '{}',
  client_signed_at TIMESTAMPTZ,
  venue_signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_agreements_booking ON public.booking_agreements(booking_id);
CREATE INDEX IF NOT EXISTS idx_agreement_templates_preferred ON public.agreement_templates(is_preferred) WHERE is_preferred = true;

ALTER TABLE public.agreement_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_agreements ENABLE ROW LEVEL SECURITY;

-- Seed default hire agreement (placeholders {{venueName}} {{client_name}} …)
INSERT INTO public.agreement_templates (name, slug, body, is_preferred, sort_order)
VALUES (
  'Venue hire agreement (default)',
  'venue-hire-default',
  E'VENUE HIRE AGREEMENT\n\nBetween {{venueName}} ("the Venue") and {{client_name}} ("the Client") for the event on {{event_date}}.\n\n1. Booking\n   Booking reference: {{booking_code}}. Event date: {{event_date}}. {{event_slot_label}}\n\n2. Fees\n   Total agreed: {{total_gbp}}. Deposit and balance as per invoice or booking record.\n\n3. Use of venue\n   The Client will use the venue only for the agreed purpose and numbers. The Venue will provide access as agreed.\n\n4. Cancellation\n   As per your standard terms (edit this template under Agreements).\n\n5. Signatures\n   Signed by the Client: _________________________  Date: __________\n\n   Signed for {{venueName}}: _________________________  Date: __________\n',
  true,
  0
) ON CONFLICT (slug) DO NOTHING;
