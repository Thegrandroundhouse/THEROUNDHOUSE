-- Re-enable RLS on agreement tables (Supabase linter 0013_rls_disabled_in_public).
-- 035 disabled RLS as a workaround; admin API uses service_role (bypasses RLS). These policies
-- allow authenticated admin/staff JWT direct access if ever used from the client.

ALTER TABLE public.agreement_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_agreements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agreement_templates_select_admin_staff" ON public.agreement_templates;
DROP POLICY IF EXISTS "agreement_templates_insert_admin_staff" ON public.agreement_templates;
DROP POLICY IF EXISTS "agreement_templates_update_admin_staff" ON public.agreement_templates;
DROP POLICY IF EXISTS "agreement_templates_delete_admin_staff" ON public.agreement_templates;

CREATE POLICY "agreement_templates_select_admin_staff" ON public.agreement_templates
  FOR SELECT TO authenticated
  USING ((select public.current_user_role()) IN ('admin', 'staff'));

CREATE POLICY "agreement_templates_insert_admin_staff" ON public.agreement_templates
  FOR INSERT TO authenticated
  WITH CHECK ((select public.current_user_role()) IN ('admin', 'staff'));

CREATE POLICY "agreement_templates_update_admin_staff" ON public.agreement_templates
  FOR UPDATE TO authenticated
  USING ((select public.current_user_role()) IN ('admin', 'staff'))
  WITH CHECK ((select public.current_user_role()) IN ('admin', 'staff'));

CREATE POLICY "agreement_templates_delete_admin_staff" ON public.agreement_templates
  FOR DELETE TO authenticated
  USING ((select public.current_user_role()) IN ('admin', 'staff'));

DROP POLICY IF EXISTS "booking_agreements_select_admin_staff" ON public.booking_agreements;
DROP POLICY IF EXISTS "booking_agreements_insert_admin_staff" ON public.booking_agreements;
DROP POLICY IF EXISTS "booking_agreements_update_admin_staff" ON public.booking_agreements;
DROP POLICY IF EXISTS "booking_agreements_delete_admin_staff" ON public.booking_agreements;

CREATE POLICY "booking_agreements_select_admin_staff" ON public.booking_agreements
  FOR SELECT TO authenticated
  USING ((select public.current_user_role()) IN ('admin', 'staff'));

CREATE POLICY "booking_agreements_insert_admin_staff" ON public.booking_agreements
  FOR INSERT TO authenticated
  WITH CHECK ((select public.current_user_role()) IN ('admin', 'staff'));

CREATE POLICY "booking_agreements_update_admin_staff" ON public.booking_agreements
  FOR UPDATE TO authenticated
  USING ((select public.current_user_role()) IN ('admin', 'staff'))
  WITH CHECK ((select public.current_user_role()) IN ('admin', 'staff'));

CREATE POLICY "booking_agreements_delete_admin_staff" ON public.booking_agreements
  FOR DELETE TO authenticated
  USING ((select public.current_user_role()) IN ('admin', 'staff'));
