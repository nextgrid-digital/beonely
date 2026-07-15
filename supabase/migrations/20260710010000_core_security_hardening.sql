-- Forward security repair for existing Beonely databases.
-- The original migration history left multiple permissive policies active at
-- once. PostgreSQL ORs permissive RLS policies, so every legacy policy must be
-- removed before the canonical policies below are installed.

ALTER TABLE public.job_seeker_profiles
ALTER COLUMN marketing_opt_in SET DEFAULT false;

ALTER TABLE public.recruiters
ALTER COLUMN marketing_opt_in SET DEFAULT false;

-- The removed 20260519120000 migration force-enabled every existing row, and
-- all application creation paths also opted users in without a choice. There
-- is no trustworthy affirmative consent to preserve from that period.
UPDATE public.job_seeker_profiles
SET marketing_opt_in = false, marketing_opt_in_at = NULL
WHERE marketing_opt_in = true;

UPDATE public.recruiters
SET marketing_opt_in = false, marketing_opt_in_at = NULL
WHERE marketing_opt_in = true;

CREATE UNIQUE INDEX IF NOT EXISTS payments_razorpay_order_id_key
ON public.payments (razorpay_order_id)
WHERE razorpay_order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS payments_razorpay_payment_id_key
ON public.payments (razorpay_payment_id)
WHERE razorpay_payment_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.recruiters AS r
    WHERE r.user_id = (SELECT auth.uid())
      AND r.role = 'admin'
      AND r.disabled = false
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.protect_recruiter_privileged_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF (SELECT auth.role()) = 'authenticated' AND NOT public.is_admin() THEN
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

DROP TRIGGER IF EXISTS recruiters_protect_privileged_fields ON public.recruiters;
CREATE TRIGGER recruiters_protect_privileged_fields
BEFORE INSERT OR UPDATE ON public.recruiters FOR EACH ROW
EXECUTE FUNCTION public.protect_recruiter_privileged_fields();

CREATE OR REPLACE FUNCTION public.protect_job_privileged_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF (SELECT auth.role()) = 'authenticated' AND NOT public.is_admin() THEN
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

DROP TRIGGER IF EXISTS jobs_protect_privileged_fields ON public.jobs;
CREATE TRIGGER jobs_protect_privileged_fields
BEFORE INSERT OR UPDATE ON public.jobs FOR EACH ROW
EXECUTE FUNCTION public.protect_job_privileged_fields();

DROP POLICY IF EXISTS "recruiters_select_own" ON public.recruiters;
DROP POLICY IF EXISTS "recruiters_insert_own" ON public.recruiters;
DROP POLICY IF EXISTS "recruiters_update_own" ON public.recruiters;
DROP POLICY IF EXISTS "recruiters_update_admin" ON public.recruiters;
DROP POLICY IF EXISTS recruiters_select ON public.recruiters;

CREATE POLICY recruiters_select
ON public.recruiters FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY recruiters_insert_own
ON public.recruiters FOR INSERT TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND role = 'recruiter'
  AND disabled = false
);

CREATE POLICY recruiters_update_own
ON public.recruiters FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY recruiters_update_admin
ON public.recruiters FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "jobs_select" ON public.jobs;
DROP POLICY IF EXISTS "jobs_insert" ON public.jobs;
DROP POLICY IF EXISTS "jobs_update" ON public.jobs;
DROP POLICY IF EXISTS "jobs_delete" ON public.jobs;
DROP POLICY IF EXISTS "Recruiters can read own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Recruiters can update unpaid or pending own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Recruiters can delete own unapproved jobs" ON public.jobs;
DROP POLICY IF EXISTS jobs_public_or_owned_select ON public.jobs;
DROP POLICY IF EXISTS jobs_insert_owned ON public.jobs;
DROP POLICY IF EXISTS jobs_update_owned_draft ON public.jobs;
DROP POLICY IF EXISTS jobs_delete_owned_draft ON public.jobs;

CREATE POLICY jobs_public_or_owned_select
ON public.jobs FOR SELECT
USING (
  (
    approval_status = 'approved'
    AND payment_status = 'paid'
    AND (listing_expires_at IS NULL OR listing_expires_at > now())
  )
  OR public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.recruiters AS r
    WHERE r.id = jobs.recruiter_id
      AND r.user_id = (SELECT auth.uid())
      AND r.disabled = false
  )
);

CREATE POLICY jobs_insert_owned
ON public.jobs FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin()
  OR (
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
  )
);

CREATE POLICY jobs_update_owned_draft
ON public.jobs FOR UPDATE TO authenticated
USING (
  public.is_admin()
  OR (
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
)
WITH CHECK (
  public.is_admin()
  OR (
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
);

CREATE POLICY jobs_delete_owned_draft
ON public.jobs FOR DELETE TO authenticated
USING (
  public.is_admin()
  OR (
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
);

CREATE OR REPLACE FUNCTION public.protect_application_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  requested_status public.application_status;
BEGIN
  IF (SELECT auth.role()) = 'authenticated' AND NOT public.is_admin() THEN
    requested_status := NEW.status;
    NEW := OLD;
    NEW.status := requested_status;
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS applications_protect_integrity ON public.applications;
CREATE TRIGGER applications_protect_integrity
BEFORE UPDATE ON public.applications FOR EACH ROW
EXECUTE FUNCTION public.protect_application_integrity();

CREATE OR REPLACE FUNCTION public.enforce_application_candidate_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  authenticated_email TEXT;
BEGIN
  IF (SELECT auth.role()) = 'authenticated' AND NOT public.is_admin() THEN
    authenticated_email := NULLIF(BTRIM((SELECT auth.jwt()) ->> 'email'), '');
    IF authenticated_email IS NULL THEN
      RAISE EXCEPTION 'authenticated_email_required';
    END IF;
    NEW.candidate_user_id := (SELECT auth.uid());
    NEW.candidate_email := authenticated_email;
    NEW.status := 'new';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS applications_enforce_candidate_identity ON public.applications;
CREATE TRIGGER applications_enforce_candidate_identity
BEFORE INSERT ON public.applications FOR EACH ROW
EXECUTE FUNCTION public.enforce_application_candidate_identity();

DROP POLICY IF EXISTS "applications_insert_candidate" ON public.applications;
DROP POLICY IF EXISTS "applications_select_recruiter_own" ON public.applications;
DROP POLICY IF EXISTS "applications_update_recruiter_own" ON public.applications;
DROP POLICY IF EXISTS "applications_admin_all" ON public.applications;

CREATE POLICY applications_insert_candidate
ON public.applications FOR INSERT TO authenticated
WITH CHECK (
  candidate_user_id = (SELECT auth.uid())
  AND status = 'new'
  AND recruiter_id = (
    SELECT j.recruiter_id
    FROM public.jobs AS j
    WHERE j.id = job_id
  )
  AND EXISTS (
    SELECT 1
    FROM public.jobs AS j
    JOIN public.recruiters AS r ON r.id = j.recruiter_id
    WHERE j.id = job_id
      AND j.source_kind = 'recruiter_posted'
      AND j.approval_status = 'approved'
      AND j.payment_status = 'paid'
      AND (j.listing_expires_at IS NULL OR j.listing_expires_at > now())
      AND r.disabled = false
  )
);

CREATE POLICY applications_select_recruiter_own
ON public.applications FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.recruiters AS r
    WHERE r.id = applications.recruiter_id
      AND r.user_id = (SELECT auth.uid())
      AND r.disabled = false
  )
);

CREATE POLICY applications_update_recruiter_own
ON public.applications FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.recruiters AS r
    WHERE r.id = applications.recruiter_id
      AND r.user_id = (SELECT auth.uid())
      AND r.disabled = false
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.recruiters AS r
    WHERE r.id = applications.recruiter_id
      AND r.user_id = (SELECT auth.uid())
      AND r.disabled = false
  )
);

CREATE POLICY applications_admin_all
ON public.applications FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS payments_select ON public.payments;
DROP POLICY IF EXISTS payments_select_owned ON public.payments;

CREATE POLICY payments_select_owned
ON public.payments FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.recruiters AS r
    WHERE r.id = payments.recruiter_id
      AND r.user_id = (SELECT auth.uid())
      AND r.disabled = false
  )
);
