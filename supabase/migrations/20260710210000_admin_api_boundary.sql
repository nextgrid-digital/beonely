-- Treat the audited, allowlisted server API as the only moderation write path.
-- Database admin-role clients retain the read access used by the dashboard, but
-- cannot promote users or mutate moderation state directly through PostgREST.

CREATE OR REPLACE FUNCTION public.protect_recruiter_privileged_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF (SELECT auth.role()) = 'authenticated' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.user_id := (SELECT auth.uid());
      NEW.role := 'recruiter';
      NEW.disabled := false;
    ELSE
      NEW.id := OLD.id;
      NEW.user_id := OLD.user_id;
      NEW.role := OLD.role;
      NEW.disabled := OLD.disabled;
      NEW.created_at := OLD.created_at;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_job_privileged_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF (SELECT auth.role()) = 'authenticated' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.source_kind := 'recruiter_posted';
      NEW.approval_status := 'pending';
      NEW.payment_status := 'unpaid';
      NEW.listing_tier := 'standard';
      NEW.listing_duration := 'weekly';
      NEW.listing_expires_at := NULL;
      NEW.featured := false;
      NEW.featured_expiry := NULL;
    ELSE
      NEW.id := OLD.id;
      NEW.recruiter_id := OLD.recruiter_id;
      NEW.source_kind := OLD.source_kind;
      NEW.approval_status := OLD.approval_status;
      NEW.payment_status := OLD.payment_status;
      NEW.listing_tier := OLD.listing_tier;
      NEW.listing_duration := OLD.listing_duration;
      NEW.listing_expires_at := OLD.listing_expires_at;
      NEW.featured := OLD.featured;
      NEW.featured_expiry := OLD.featured_expiry;
      NEW.created_at := OLD.created_at;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS recruiters_update_admin ON public.recruiters;

DROP POLICY IF EXISTS jobs_insert_owned ON public.jobs;
CREATE POLICY jobs_insert_owned
ON public.jobs FOR INSERT TO authenticated
WITH CHECK (
  source_kind = 'recruiter_posted'
  AND approval_status = 'pending'
  AND payment_status = 'unpaid'
  AND EXISTS (
    SELECT 1
    FROM public.recruiters AS r
    WHERE r.id = jobs.recruiter_id
      AND r.user_id = (SELECT auth.uid())
      AND r.disabled = false
  )
);

DROP POLICY IF EXISTS jobs_update_owned_draft ON public.jobs;
CREATE POLICY jobs_update_owned_draft
ON public.jobs FOR UPDATE TO authenticated
USING (
  source_kind = 'recruiter_posted'
  AND approval_status <> 'approved'
  AND EXISTS (
    SELECT 1
    FROM public.recruiters AS r
    WHERE r.id = jobs.recruiter_id
      AND r.user_id = (SELECT auth.uid())
      AND r.disabled = false
  )
)
WITH CHECK (
  source_kind = 'recruiter_posted'
  AND approval_status <> 'approved'
  AND EXISTS (
    SELECT 1
    FROM public.recruiters AS r
    WHERE r.id = jobs.recruiter_id
      AND r.user_id = (SELECT auth.uid())
      AND r.disabled = false
  )
);

DROP POLICY IF EXISTS jobs_delete_owned_draft ON public.jobs;
CREATE POLICY jobs_delete_owned_draft
ON public.jobs FOR DELETE TO authenticated
USING (
  source_kind = 'recruiter_posted'
  AND approval_status <> 'approved'
  AND EXISTS (
    SELECT 1
    FROM public.recruiters AS r
    WHERE r.id = jobs.recruiter_id
      AND r.user_id = (SELECT auth.uid())
      AND r.disabled = false
  )
);

DROP POLICY IF EXISTS applications_admin_all ON public.applications;
DROP POLICY IF EXISTS applications_admin_select ON public.applications;
CREATE POLICY applications_admin_select
ON public.applications FOR SELECT TO authenticated
USING (public.is_admin());
