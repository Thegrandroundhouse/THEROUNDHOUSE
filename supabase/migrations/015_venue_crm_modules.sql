-- Venue CRM: spaces, holds, vendors, packages, wedding details, payments, tasks, documents, comms

CREATE TABLE IF NOT EXISTS public.venue_spaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  capacity INT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.date_holds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  space_id UUID REFERENCES public.venue_spaces(id) ON DELETE CASCADE,
  hold_date DATE NOT NULL,
  note TEXT,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS date_holds_per_space_day ON public.date_holds (space_id, hold_date) WHERE space_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS date_holds_whole_venue_day ON public.date_holds (hold_date) WHERE space_id IS NULL;

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS space_id UUID REFERENCES public.venue_spaces(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_type TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  preferred BOOLEAN NOT NULL DEFAULT false,
  commission_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.booking_vendors (
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  role TEXT,
  PRIMARY KEY (booking_id, vendor_id)
);

CREATE TABLE IF NOT EXISTS public.packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  base_price_cents INT,
  includes JSONB DEFAULT '[]'::jsonb,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.package_addons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  price_cents INT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.booking_wedding_details (
  booking_id UUID PRIMARY KEY REFERENCES public.bookings(id) ON DELETE CASCADE,
  guest_count INT,
  seating_notes TEXT,
  menu_selection TEXT,
  decoration_preferences TEXT,
  vendor_coordination_notes TEXT,
  timeline JSONB DEFAULT '[]'::jsonb,
  internal_special_requests TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.booking_payment_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  label TEXT NOT NULL,
  amount_cents INT,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'refunded', 'waived')),
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.booking_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT false,
  due_date DATE,
  workflow_key TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.booking_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  doc_type TEXT,
  file_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.booking_communications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  channel TEXT,
  direction TEXT,
  subject TEXT,
  body TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.venue_spaces (name, slug, capacity, sort_order)
VALUES
  ('Main hall', 'main-hall', 200, 1),
  ('Garden', 'garden', 120, 2),
  ('Terrace', 'terrace', 80, 3)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE public.venue_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.date_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_wedding_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_payment_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_communications ENABLE ROW LEVEL SECURITY;
