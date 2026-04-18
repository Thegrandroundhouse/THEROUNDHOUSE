-- Row Level Security: who can read/write each table.
-- Assumes profiles.role is set (admin, staff, guest).

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_nav ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_images ENABLE ROW LEVEL SECURITY;

-- Helper: current user role
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Profiles: users can read/update own profile
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
-- Admin can read all
CREATE POLICY "profiles_select_admin" ON public.profiles FOR SELECT USING (public.current_user_role() = 'admin');

-- Staff: admin only
CREATE POLICY "staff_all_admin" ON public.staff FOR ALL USING (public.current_user_role() = 'admin');

-- Site nav & content: public read; admin/staff write
CREATE POLICY "site_nav_select" ON public.site_nav FOR SELECT TO anon, authenticated USING (is_visible = true);
CREATE POLICY "site_nav_all_admin_staff" ON public.site_nav FOR ALL USING (public.current_user_role() IN ('admin', 'staff'));

CREATE POLICY "site_content_select" ON public.site_content FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "site_content_all_admin_staff" ON public.site_content FOR ALL USING (public.current_user_role() IN ('admin', 'staff'));

-- Calendar: public read (for main page); admin/staff write
CREATE POLICY "venue_calendar_select" ON public.venue_calendar FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "venue_calendar_all_admin_staff" ON public.venue_calendar FOR ALL USING (public.current_user_role() IN ('admin', 'staff'));

-- Pricing: optional public read; admin/staff write (or restrict to admin only)
CREATE POLICY "pricing_select" ON public.pricing FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "pricing_all_admin_staff" ON public.pricing FOR ALL USING (public.current_user_role() IN ('admin', 'staff'));

-- Bookings: admin/staff only
CREATE POLICY "bookings_all_admin_staff" ON public.bookings FOR ALL USING (public.current_user_role() IN ('admin', 'staff'));

-- Enquiries: anyone can insert (form); admin/staff read/update
CREATE POLICY "enquiries_insert" ON public.enquiries FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "enquiries_select_update_admin_staff" ON public.enquiries FOR SELECT USING (public.current_user_role() IN ('admin', 'staff'));
CREATE POLICY "enquiries_update_admin_staff" ON public.enquiries FOR UPDATE USING (public.current_user_role() IN ('admin', 'staff'));

-- Invoices: admin/staff only
CREATE POLICY "invoices_all_admin_staff" ON public.invoices FOR ALL USING (public.current_user_role() IN ('admin', 'staff'));

-- Site images: public read; admin/staff write
CREATE POLICY "site_images_select" ON public.site_images FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "site_images_all_admin_staff" ON public.site_images FOR ALL USING (public.current_user_role() IN ('admin', 'staff'));
