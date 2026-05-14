-- Replace single FOR ALL policy with explicit per-command policies.
-- Fixes cases where inserts fail with: new row violates row-level security policy (42501).
-- Uses (select auth.uid()) per Supabase RLS guidance for plan stability.

ALTER TABLE public.job_seeker_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "job_seeker_profiles_own" ON public.job_seeker_profiles;

DROP POLICY IF EXISTS "job_seeker_profiles_select_own" ON public.job_seeker_profiles;

DROP POLICY IF EXISTS "job_seeker_profiles_insert_own" ON public.job_seeker_profiles;

DROP POLICY IF EXISTS "job_seeker_profiles_update_own" ON public.job_seeker_profiles;

DROP POLICY IF EXISTS "job_seeker_profiles_delete_own" ON public.job_seeker_profiles;

CREATE POLICY "job_seeker_profiles_select_own"
ON public.job_seeker_profiles
FOR SELECT
TO authenticated
USING ((select auth.uid()) = user_id);

CREATE POLICY "job_seeker_profiles_insert_own"
ON public.job_seeker_profiles
FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "job_seeker_profiles_update_own"
ON public.job_seeker_profiles
FOR UPDATE
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "job_seeker_profiles_delete_own"
ON public.job_seeker_profiles
FOR DELETE
TO authenticated
USING ((select auth.uid()) = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_seeker_profiles TO authenticated;
