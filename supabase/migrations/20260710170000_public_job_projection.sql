-- Public job discovery must not expose recruiter contact details or privileged
-- rows. RLS filters rows, not columns, so publish through a narrow projection.

DROP POLICY IF EXISTS jobs_public_or_owned_select ON public.jobs;
DROP POLICY IF EXISTS jobs_owned_or_admin_select ON public.jobs;

CREATE POLICY jobs_owned_or_admin_select
ON public.jobs FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.recruiters AS r
    WHERE r.id = jobs.recruiter_id
      AND r.user_id = (SELECT auth.uid())
      AND r.disabled = false
  )
);

REVOKE SELECT ON public.jobs FROM anon;

CREATE OR REPLACE VIEW public.public_jobs
WITH (security_barrier = true)
AS
SELECT
  j.id,
  j.recruiter_id,
  j.job_slug,
  j.job_title,
  j.company_name,
  j.company_website,
  j.company_logo,
  j.job_description,
  j.location,
  j.apply_url,
  j.employment_type,
  j.experience_level,
  j.work_mode,
  j.job_type,
  j.modules,
  j.certifications,
  j.skills,
  j.salary_range,
  j.approval_status,
  j.payment_status,
  j.listing_duration,
  j.listing_tier,
  j.listing_expires_at,
  j.featured,
  j.featured_expiry,
  j.source_kind,
  j.created_at,
  j.updated_at,
  ''::TEXT AS recruiter_email,
  ''::TEXT AS recruiter_name
FROM public.jobs AS j
JOIN public.recruiters AS r ON r.id = j.recruiter_id
WHERE j.approval_status = 'approved'
  AND j.payment_status = 'paid'
  AND r.disabled = false
  AND (j.listing_expires_at IS NULL OR j.listing_expires_at > now());

REVOKE ALL ON public.public_jobs FROM PUBLIC;
GRANT SELECT ON public.public_jobs TO anon, authenticated, service_role;

COMMENT ON VIEW public.public_jobs IS
  'Live public job projection. Recruiter contact fields are intentionally redacted.';

CREATE OR REPLACE FUNCTION public.can_apply_to_job(
  p_job_id UUID,
  p_recruiter_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.jobs AS j
    JOIN public.recruiters AS r ON r.id = j.recruiter_id
    WHERE j.id = p_job_id
      AND j.recruiter_id = p_recruiter_id
      AND j.source_kind = 'recruiter_posted'
      AND j.approval_status = 'approved'
      AND j.payment_status = 'paid'
      AND (j.listing_expires_at IS NULL OR j.listing_expires_at > now())
      AND r.disabled = false
  );
$$;

REVOKE ALL ON FUNCTION public.can_apply_to_job(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_apply_to_job(UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_application_candidate_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  authenticated_email TEXT;
  target_recruiter_id UUID;
BEGIN
  IF (SELECT auth.role()) = 'authenticated' AND NOT public.is_admin() THEN
    authenticated_email := NULLIF(BTRIM((SELECT auth.jwt()) ->> 'email'), '');
    IF authenticated_email IS NULL THEN
      RAISE EXCEPTION 'authenticated_email_required';
    END IF;

    SELECT j.recruiter_id
    INTO target_recruiter_id
    FROM public.jobs AS j
    WHERE j.id = NEW.job_id;

    IF target_recruiter_id IS NULL THEN
      RAISE EXCEPTION 'job_not_found';
    END IF;

    NEW.candidate_user_id := (SELECT auth.uid());
    NEW.candidate_email := authenticated_email;
    NEW.recruiter_id := target_recruiter_id;
    NEW.status := 'new';
  END IF;
  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS applications_insert_candidate ON public.applications;
CREATE POLICY applications_insert_candidate
ON public.applications FOR INSERT TO authenticated
WITH CHECK (
  candidate_user_id = (SELECT auth.uid())
  AND status = 'new'
  AND public.can_apply_to_job(job_id, recruiter_id)
);
