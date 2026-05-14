-- Beonely applications: candidates apply in-app to recruiter_posted jobs; recruiters review snapshots.

DO $$
BEGIN
  CREATE TYPE public.application_status AS ENUM (
    'new',
    'reviewed',
    'shortlisted',
    'rejected'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
  candidate_user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs (id) ON DELETE CASCADE,
  recruiter_id UUID NOT NULL REFERENCES public.recruiters (id) ON DELETE CASCADE,
  candidate_email TEXT NOT NULL,
  candidate_name TEXT NOT NULL,
  candidate_phone TEXT,
  linkedin_url TEXT,
  current_company TEXT,
  experience_years REAL,
  resume_url TEXT,
  resume_storage_path TEXT,
  note TEXT,
  match_score REAL,
  match_rationale TEXT,
  status public.application_status NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT applications_candidate_job_unique UNIQUE (candidate_user_id, job_id)
);

-- Additive upgrades when `applications` already existed without candidate linkage
ALTER TABLE public.applications
ADD COLUMN IF NOT EXISTS candidate_user_id UUID REFERENCES auth.users (id) ON DELETE CASCADE;

ALTER TABLE public.applications
ADD COLUMN IF NOT EXISTS resume_storage_path TEXT;

DO $$
BEGIN
  ALTER TABLE public.applications ADD CONSTRAINT applications_candidate_job_unique UNIQUE (candidate_user_id, job_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE INDEX IF NOT EXISTS applications_job_id_idx ON public.applications (job_id);

CREATE INDEX IF NOT EXISTS applications_recruiter_id_idx ON public.applications (recruiter_id);

CREATE INDEX IF NOT EXISTS applications_candidate_user_id_idx ON public.applications (candidate_user_id);

DROP TRIGGER IF EXISTS applications_updated ON public.applications;

CREATE TRIGGER applications_updated
BEFORE UPDATE ON public.applications FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at ();

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "applications_insert_candidate" ON public.applications;

DROP POLICY IF EXISTS "applications_select_candidate_own" ON public.applications;

DROP POLICY IF EXISTS "applications_select_recruiter_own" ON public.applications;

DROP POLICY IF EXISTS "applications_update_recruiter_own" ON public.applications;

DROP POLICY IF EXISTS "applications_admin_all" ON public.applications;

CREATE POLICY "applications_insert_candidate"
ON public.applications FOR INSERT TO authenticated
WITH CHECK (
  candidate_user_id = (select auth.uid())
  AND recruiter_id = (
    SELECT j.recruiter_id
    FROM public.jobs j
    WHERE
      j.id = job_id
  )
  AND EXISTS (
    SELECT 1
    FROM public.jobs j
    WHERE
      j.id = job_id
      AND j.source_kind = 'recruiter_posted'
      AND j.approval_status = 'approved'
      AND j.payment_status = 'paid'
      AND (
        j.listing_expires_at IS NULL
        OR j.listing_expires_at > now()
      )
  )
);

CREATE POLICY "applications_select_candidate_own"
ON public.applications FOR SELECT TO authenticated
USING (candidate_user_id = (select auth.uid()));

CREATE POLICY "applications_select_recruiter_own"
ON public.applications FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.recruiters r
    WHERE
      r.id = applications.recruiter_id
      AND r.user_id = (select auth.uid())
  )
);

CREATE POLICY "applications_update_recruiter_own"
ON public.applications FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.recruiters r
    WHERE
      r.id = applications.recruiter_id
      AND r.user_id = (select auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.recruiters r
    WHERE
      r.id = applications.recruiter_id
      AND r.user_id = (select auth.uid())
  )
);

CREATE POLICY "applications_admin_all"
ON public.applications FOR ALL TO authenticated
USING (public.is_admin ())
WITH CHECK (public.is_admin ());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;
