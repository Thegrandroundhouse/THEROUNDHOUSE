-- Supabase linter: auth_rls_initplan + multiple_permissive_policies
-- See: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- Helper: use (select auth.uid()) inside function body so callers get stable plan where applicable
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = (select auth.uid()) LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- profiles: initplan + single SELECT / single UPDATE (no duplicate permissive)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT
  USING (
    (select auth.uid()) = id
    OR (select public.current_user_role()) = 'admin'
  );

-- Own row or admin (staff edit own profile only — align with original)
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE
  USING (
    (select auth.uid()) = id
    OR (select public.current_user_role()) = 'admin'
  );

-- ---------------------------------------------------------------------------
-- site_settings: initplan + split ALL → INSERT/UPDATE/DELETE only
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "site_settings_all_admin_staff" ON public.site_settings;

CREATE POLICY "site_settings_insert_admin" ON public.site_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role IN ('admin', 'staff')
    )
  );

CREATE POLICY "site_settings_update_admin" ON public.site_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role IN ('admin', 'staff')
    )
  );

CREATE POLICY "site_settings_delete_admin" ON public.site_settings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role IN ('admin', 'staff')
    )
  );

-- ---------------------------------------------------------------------------
-- pricing: one SELECT policy; admin/staff write separate
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "pricing_all_admin_staff" ON public.pricing;

CREATE POLICY "pricing_insert_admin_staff" ON public.pricing
  FOR INSERT
  WITH CHECK ((select public.current_user_role()) IN ('admin', 'staff'));

CREATE POLICY "pricing_update_admin_staff" ON public.pricing
  FOR UPDATE
  USING ((select public.current_user_role()) IN ('admin', 'staff'));

CREATE POLICY "pricing_delete_admin_staff" ON public.pricing
  FOR DELETE
  USING ((select public.current_user_role()) IN ('admin', 'staff'));

-- ---------------------------------------------------------------------------
-- site_nav: one SELECT (public visible OR admin/staff see all); write split
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "site_nav_select" ON public.site_nav;
DROP POLICY IF EXISTS "site_nav_all_admin_staff" ON public.site_nav;

CREATE POLICY "site_nav_select" ON public.site_nav
  FOR SELECT TO anon, authenticated
  USING (
    is_visible = true
    OR (select public.current_user_role()) IN ('admin', 'staff')
  );

CREATE POLICY "site_nav_insert_admin_staff" ON public.site_nav
  FOR INSERT WITH CHECK ((select public.current_user_role()) IN ('admin', 'staff'));
CREATE POLICY "site_nav_update_admin_staff" ON public.site_nav
  FOR UPDATE USING ((select public.current_user_role()) IN ('admin', 'staff'));
CREATE POLICY "site_nav_delete_admin_staff" ON public.site_nav
  FOR DELETE USING ((select public.current_user_role()) IN ('admin', 'staff'));

-- ---------------------------------------------------------------------------
-- site_content
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "site_content_all_admin_staff" ON public.site_content;

CREATE POLICY "site_content_insert_admin_staff" ON public.site_content
  FOR INSERT WITH CHECK ((select public.current_user_role()) IN ('admin', 'staff'));
CREATE POLICY "site_content_update_admin_staff" ON public.site_content
  FOR UPDATE USING ((select public.current_user_role()) IN ('admin', 'staff'));
CREATE POLICY "site_content_delete_admin_staff" ON public.site_content
  FOR DELETE USING ((select public.current_user_role()) IN ('admin', 'staff'));

-- ---------------------------------------------------------------------------
-- venue_calendar
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "venue_calendar_all_admin_staff" ON public.venue_calendar;

CREATE POLICY "venue_calendar_insert_admin_staff" ON public.venue_calendar
  FOR INSERT WITH CHECK ((select public.current_user_role()) IN ('admin', 'staff'));
CREATE POLICY "venue_calendar_update_admin_staff" ON public.venue_calendar
  FOR UPDATE USING ((select public.current_user_role()) IN ('admin', 'staff'));
CREATE POLICY "venue_calendar_delete_admin_staff" ON public.venue_calendar
  FOR DELETE USING ((select public.current_user_role()) IN ('admin', 'staff'));

-- ---------------------------------------------------------------------------
-- site_images
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "site_images_all_admin_staff" ON public.site_images;

CREATE POLICY "site_images_insert_admin_staff" ON public.site_images
  FOR INSERT WITH CHECK ((select public.current_user_role()) IN ('admin', 'staff'));
CREATE POLICY "site_images_update_admin_staff" ON public.site_images
  FOR UPDATE USING ((select public.current_user_role()) IN ('admin', 'staff'));
CREATE POLICY "site_images_delete_admin_staff" ON public.site_images
  FOR DELETE USING ((select public.current_user_role()) IN ('admin', 'staff'));
