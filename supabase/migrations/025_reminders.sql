-- Reminders: staff can set reminders linked to bookings or invoices
CREATE TABLE IF NOT EXISTS public.reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  remind_at TIMESTAMPTZ NOT NULL,
  done BOOLEAN NOT NULL DEFAULT false,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reminders_remind_at ON public.reminders(remind_at);
CREATE INDEX IF NOT EXISTS idx_reminders_booking ON public.reminders(booking_id);
CREATE INDEX IF NOT EXISTS idx_reminders_invoice ON public.reminders(invoice_id);
CREATE INDEX IF NOT EXISTS idx_reminders_done ON public.reminders(done);

COMMENT ON TABLE public.reminders IS 'Staff reminders; can link to a booking or invoice.';

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reminders_admin_staff_all" ON public.reminders FOR ALL
  USING (public.current_user_role() IN ('admin', 'staff'))
  WITH CHECK (public.current_user_role() IN ('admin', 'staff'));
