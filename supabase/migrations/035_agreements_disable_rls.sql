-- API uses service role; RLS on agreement tables caused INSERT 500 for some setups.
ALTER TABLE IF EXISTS public.agreement_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.booking_agreements DISABLE ROW LEVEL SECURITY;
