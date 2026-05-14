-- Candidate self-service on job_seeker_profiles (alongside existing admin-only policy).
-- Remote Beonely had only "Admins manage job seeker profiles" (is_admin()) — candidates hit 42501.
-- Adds own-row policies + resume_storage_path + private resumes bucket.

ALTER TABLE public.job_seeker_profiles
ADD COLUMN IF NOT EXISTS resume_storage_path TEXT;

ALTER TABLE public.job_seeker_profiles ENABLE ROW LEVEL SECURITY;

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

-- Private resumes bucket: first path segment must equal auth.uid().
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "resumes_select_own" ON storage.objects;

DROP POLICY IF EXISTS "resumes_insert_own" ON storage.objects;

DROP POLICY IF EXISTS "resumes_update_own" ON storage.objects;

DROP POLICY IF EXISTS "resumes_delete_own" ON storage.objects;

CREATE POLICY "resumes_select_own"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'resumes'
  AND (storage.foldername (name))[1] = (select auth.uid())::text
);

CREATE POLICY "resumes_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'resumes'
  AND (storage.foldername (name))[1] = (select auth.uid())::text
);

CREATE POLICY "resumes_update_own"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'resumes'
  AND (storage.foldername (name))[1] = (select auth.uid())::text
);

CREATE POLICY "resumes_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'resumes'
  AND (storage.foldername (name))[1] = (select auth.uid())::text
);
