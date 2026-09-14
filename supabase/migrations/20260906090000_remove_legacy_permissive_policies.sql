-- The deployed May baseline used human-readable policy names that were not
-- removed by the July hardening chain. Permissive policies are ORed, so those
-- names could bypass the canonical owner-only policies even after hardening.
-- This forward repair changes access metadata only; no application rows change.

DO $$
DECLARE
  required_policy RECORD;
BEGIN
  FOR required_policy IN
    SELECT * FROM (VALUES
      ('recruiters', 'recruiters_select_own'),
      ('recruiters', 'recruiters_insert_own'),
      ('recruiters', 'recruiters_update_own'),
      ('jobs', 'jobs_owned_select'),
      ('jobs', 'jobs_insert_owned'),
      ('jobs', 'jobs_update_owned_draft'),
      ('jobs', 'jobs_delete_owned_draft'),
      ('job_seeker_profiles', 'job_seeker_profiles_select_own'),
      ('applications', 'applications_insert_candidate'),
      ('applications', 'applications_select_candidate_own'),
      ('applications', 'applications_select_recruiter_own'),
      ('applications', 'applications_update_recruiter_own'),
      ('payments', 'payments_select_owned')
    ) AS expected(table_name, policy_name)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies p
      JOIN pg_class c ON c.relname = p.tablename
      JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = p.schemaname
      WHERE p.schemaname = 'public'
        AND p.tablename = required_policy.table_name
        AND p.policyname = required_policy.policy_name
        AND c.relrowsecurity
    ) THEN
      RAISE EXCEPTION 'Apply the complete July hardening chain first: missing %.%',
        required_policy.table_name, required_policy.policy_name;
    END IF;
  END LOOP;
END;
$$;

DROP POLICY IF EXISTS "Approved paid jobs are public" ON public.jobs;
DROP POLICY IF EXISTS "Recruiters can insert own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Recruiters can read themselves" ON public.recruiters;
DROP POLICY IF EXISTS "Recruiters can insert themselves" ON public.recruiters;
DROP POLICY IF EXISTS "Recruiters can update themselves" ON public.recruiters;
DROP POLICY IF EXISTS "Recruiters can read own payments" ON public.payments;
DROP POLICY IF EXISTS "Public can apply to approved paid jobs" ON public.applications;
DROP POLICY IF EXISTS "Recruiters can read own applications" ON public.applications;
DROP POLICY IF EXISTS "Recruiters can update own application status" ON public.applications;
DROP POLICY IF EXISTS "Admins manage job seeker profiles" ON public.job_seeker_profiles;
DROP POLICY IF EXISTS "Admins manage email subscribers" ON public.email_subscribers;
DROP POLICY IF EXISTS "Admins manage campaigns" ON public.email_campaigns;
DROP POLICY IF EXISTS "Admins manage campaign recipients" ON public.email_campaign_recipients;
DROP POLICY IF EXISTS "Admins manage operator feedback" ON public.operator_feedback;

COMMENT ON VIEW public.public_jobs IS
  'Intentional security-barrier public projection: only active approved paid jobs from enabled recruiters; recruiter contact fields are redacted. Base jobs remain owner-only.';
