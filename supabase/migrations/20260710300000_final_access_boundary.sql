-- Keep privileged administration and cross-account PII reads behind the
-- allowlisted server API. Authenticated browser clients retain only the rows
-- they own; the service role remains the sole caller of admin aggregate RPCs.

-- A browser-authenticated admin must not bypass the same application snapshot
-- integrity rules enforced for recruiters. Service-role handlers remain able
-- to perform trusted maintenance when required.
CREATE OR REPLACE FUNCTION public.protect_application_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  requested_status public.application_status;
BEGIN
  IF (SELECT auth.role()) = 'authenticated' THEN
    requested_status := NEW.status;
    NEW := OLD;
    NEW.status := requested_status;
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_application_integrity()
FROM PUBLIC, anon, authenticated;

-- Recruiter records contain private contact and account-state fields. A
-- signed-in user may resolve only their own persona row from the browser.
DROP POLICY IF EXISTS recruiters_select ON public.recruiters;
DROP POLICY IF EXISTS recruiters_select_own ON public.recruiters;

CREATE POLICY recruiters_select_own
ON public.recruiters FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

-- The public job feed is exposed by public.public_jobs. Direct table reads are
-- reserved for the owning, active recruiter; cross-account moderation uses the
-- server API and its service-role client.
DROP POLICY IF EXISTS jobs_public_or_owned_select ON public.jobs;
DROP POLICY IF EXISTS jobs_owned_or_admin_select ON public.jobs;
DROP POLICY IF EXISTS jobs_owned_select ON public.jobs;
DROP POLICY IF EXISTS "Recruiters can read own jobs" ON public.jobs;

CREATE POLICY jobs_owned_select
ON public.jobs FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.recruiters AS r
    WHERE r.id = jobs.recruiter_id
      AND r.user_id = (SELECT auth.uid())
      AND r.disabled = false
  )
);

-- Candidate profiles include resumes, contact details, and portfolio drafts.
-- Collapse historical overlapping policies to one unambiguous owner-only read
-- rule while preserving the existing owner insert/update/delete policies.
DROP POLICY IF EXISTS job_seeker_profiles_select ON public.job_seeker_profiles;
DROP POLICY IF EXISTS job_seeker_profiles_select_admin ON public.job_seeker_profiles;
DROP POLICY IF EXISTS job_seeker_profiles_select_own ON public.job_seeker_profiles;
DROP POLICY IF EXISTS job_seeker_profiles_own ON public.job_seeker_profiles;

CREATE POLICY job_seeker_profiles_select_own
ON public.job_seeker_profiles FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

-- Candidate and recruiter owner policies remain in force. Remove only the
-- cross-account admin policies so application PII is read through the API.
DROP POLICY IF EXISTS applications_admin_all ON public.applications;
DROP POLICY IF EXISTS applications_admin_select ON public.applications;

-- Payment rows contain provider identifiers and commercial data. Recruiters
-- retain access to their own records; admin revenue reads use the server API.
DROP POLICY IF EXISTS payments_select ON public.payments;
DROP POLICY IF EXISTS payments_select_owned ON public.payments;
DROP POLICY IF EXISTS payments_admin_select ON public.payments;

CREATE POLICY payments_select_owned
ON public.payments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.recruiters AS r
    WHERE r.id = payments.recruiter_id
      AND r.user_id = (SELECT auth.uid())
      AND r.disabled = false
  )
);

-- These admin-only datasets have no browser owner use case.
DROP POLICY IF EXISTS hiring_requests_admin_select ON public.hiring_requests;
DROP POLICY IF EXISTS admin_audit_log_select_admin ON public.admin_audit_log;
DROP POLICY IF EXISTS email_automation_rules_admin_select ON public.email_automation_rules;
DROP POLICY IF EXISTS email_send_log_admin_select ON public.email_send_log;
DROP POLICY IF EXISTS email_campaigns_admin_select ON public.email_campaigns;
DROP POLICY IF EXISTS email_campaign_recipients_admin_select ON public.email_campaign_recipients;
DROP POLICY IF EXISTS email_subscribers_admin_select ON public.email_subscribers;
DROP POLICY IF EXISTS email_templates_admin_select ON public.email_templates;

REVOKE SELECT ON TABLE public.hiring_requests FROM authenticated;
REVOKE SELECT ON TABLE public.admin_audit_log FROM authenticated;
REVOKE SELECT ON TABLE public.email_automation_rules FROM authenticated;
REVOKE SELECT ON TABLE public.email_send_log FROM authenticated;
REVOKE SELECT ON TABLE public.email_campaigns FROM authenticated;
REVOKE SELECT ON TABLE public.email_campaign_recipients FROM authenticated;
REVOKE SELECT ON TABLE public.email_subscribers FROM authenticated;
REVOKE SELECT ON TABLE public.email_templates FROM authenticated;

GRANT SELECT ON TABLE public.hiring_requests TO service_role;
GRANT SELECT ON TABLE public.admin_audit_log TO service_role;
GRANT SELECT ON TABLE public.email_automation_rules TO service_role;
GRANT SELECT ON TABLE public.email_send_log TO service_role;
GRANT SELECT ON TABLE public.email_campaigns TO service_role;
GRANT SELECT ON TABLE public.email_campaign_recipients TO service_role;
GRANT SELECT ON TABLE public.email_subscribers TO service_role;
GRANT SELECT ON TABLE public.email_templates TO service_role;

-- SECURITY DEFINER admin aggregates are callable only by trusted server code.
REVOKE ALL ON FUNCTION public.get_admin_dashboard_stats()
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats() TO service_role;

REVOKE ALL ON FUNCTION public.get_admin_email_analytics()
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_email_analytics() TO service_role;

REVOKE ALL ON FUNCTION public.get_admin_email_automation_counts()
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_email_automation_counts() TO service_role;
