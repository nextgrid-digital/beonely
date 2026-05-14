-- Candidate saved jobs & applications (auth.users FK). IF NOT EXISTS keeps older DBs safe.
CREATE TABLE IF NOT EXISTS public.saved_jobs (
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, job_id)
);

CREATE TABLE IF NOT EXISTS public.job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs (id) ON DELETE CASCADE,
  notes TEXT,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, job_id)
);

ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saved_jobs_own" ON public.saved_jobs;

CREATE POLICY "saved_jobs_own"
ON public.saved_jobs FOR ALL
TO authenticated
USING (user_id = auth.uid ())
WITH CHECK (user_id = auth.uid ());

DROP POLICY IF EXISTS "job_applications_own" ON public.job_applications;

CREATE POLICY "job_applications_own"
ON public.job_applications FOR ALL
TO authenticated
USING (user_id = auth.uid ())
WITH CHECK (user_id = auth.uid ());

GRANT SELECT, INSERT, DELETE ON public.saved_jobs TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_applications TO authenticated;

-- Resume file path (private bucket); markdown/structured stay on row.
ALTER TABLE public.job_seeker_profiles
ADD COLUMN IF NOT EXISTS resume_storage_path TEXT;

ALTER TABLE public.job_seeker_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "job_seeker_profiles_own" ON public.job_seeker_profiles;

CREATE POLICY "job_seeker_profiles_own"
ON public.job_seeker_profiles FOR ALL
TO authenticated
USING (user_id = auth.uid ())
WITH CHECK (user_id = auth.uid ());

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
  AND (storage.foldername (name))[1] = auth.uid ()::text
);

CREATE POLICY "resumes_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'resumes'
  AND (storage.foldername (name))[1] = auth.uid ()::text
);

CREATE POLICY "resumes_update_own"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'resumes'
  AND (storage.foldername (name))[1] = auth.uid ()::text
);

CREATE POLICY "resumes_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'resumes'
  AND (storage.foldername (name))[1] = auth.uid ()::text
);
