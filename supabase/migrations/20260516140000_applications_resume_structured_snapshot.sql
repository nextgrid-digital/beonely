-- Snapshot of candidate resume JSON at apply time (recruiters cannot SELECT job_seeker_profiles).
ALTER TABLE public.applications
ADD COLUMN IF NOT EXISTS resume_structured_snapshot jsonb;

COMMENT ON COLUMN public.applications.resume_structured_snapshot IS
  'Copy of job_seeker_profiles.resume_structured at insert; recruiter-visible under applications RLS.';
