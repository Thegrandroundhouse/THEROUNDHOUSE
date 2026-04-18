-- Linter: function_search_path_mutable + rls_policy_always_true (enquiries INSERT)
-- Auth leaked password: enable in Dashboard (see docs/SECURITY.md)

-- -----------------------------------------------------------------------------
-- Immutable search_path on SECURITY DEFINER functions
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'guest')
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT p.role
  FROM public.profiles AS p
  WHERE p.id = (SELECT auth.uid())
  LIMIT 1;
$$;

-- -----------------------------------------------------------------------------
-- Enquiries: public INSERT must look like a real lead (not WITH CHECK (true))
-- Contact form still works: name, email, required; forces status new; no CRM fields.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "enquiries_insert" ON public.enquiries;

CREATE POLICY "enquiries_insert" ON public.enquiries
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    status = 'new'
    AND char_length(trim(name)) BETWEEN 1 AND 500
    AND char_length(trim(email)) BETWEEN 3 AND 320
    AND trim(email) ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    AND (notes IS NULL OR trim(notes) = '')
    AND (follow_up_notes IS NULL OR trim(COALESCE(follow_up_notes, '')) = '')
    AND last_contact_at IS NULL
  );

COMMENT ON POLICY "enquiries_insert" ON public.enquiries IS
  'Public enquiry form: required name/email shape; cannot set CRM-only fields or non-new status.';
