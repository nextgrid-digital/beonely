-- Admin identity: recruiters.role (not deprecated profiles.role) + staff disable flag.

ALTER TABLE public.recruiters
ADD COLUMN IF NOT EXISTS disabled BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.is_admin ()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.recruiters r
    WHERE
      r.user_id = auth.uid ()
      AND r.role = 'admin'
      AND COALESCE(r.disabled, false) = false
  );
$$;

-- Candidates list for admin console (read-only).
DROP POLICY IF EXISTS "job_seeker_profiles_select_admin" ON public.job_seeker_profiles;

CREATE POLICY "job_seeker_profiles_select_admin"
ON public.job_seeker_profiles
FOR SELECT
TO authenticated
USING (public.is_admin ());

-- Recruiter disable / admin edits on recruiter rows.
DROP POLICY IF EXISTS "recruiters_update_admin" ON public.recruiters;

CREATE POLICY "recruiters_update_admin"
ON public.recruiters
FOR UPDATE
TO authenticated
USING (public.is_admin ())
WITH CHECK (public.is_admin ());
