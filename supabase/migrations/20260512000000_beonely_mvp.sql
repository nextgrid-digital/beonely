-- Beonely MVP schema + RLS
-- Run via Supabase CLI or SQL editor

-- Enums
CREATE TYPE public.user_role AS ENUM ('candidate', 'recruiter', 'admin');
CREATE TYPE public.job_status AS ENUM (
  'draft',
  'pending_payment',
  'pending_review',
  'published',
  'rejected',
  'expired'
);
CREATE TYPE public.payment_plan AS ENUM (
  'standard_week',
  'standard_month',
  'featured_week',
  'featured_month'
);
CREATE TYPE public.payment_status AS ENUM (
  'created',
  'paid',
  'failed',
  'refunded'
);

-- Profiles (1:1 auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.user_role NOT NULL DEFAULT 'candidate',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.recruiters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  billing_info JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
  recruiter_id UUID REFERENCES public.recruiters (id) ON DELETE SET NULL,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  employment_type TEXT NOT NULL DEFAULT 'full_time',
  experience_level TEXT,
  work_mode TEXT,
  org_type TEXT,
  role_category TEXT,
  featured BOOLEAN NOT NULL DEFAULT false,
  featured_until TIMESTAMPTZ,
  status public.job_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  source TEXT NOT NULL DEFAULT 'manual',
  apply_url TEXT NOT NULL,
  dedupe_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX jobs_published_idx ON public.jobs (published_at DESC NULLS LAST)
WHERE
  status = 'published';

CREATE INDEX jobs_featured_idx ON public.jobs (featured, featured_until)
WHERE
  status = 'published';

CREATE INDEX jobs_status_idx ON public.jobs (status);

CREATE UNIQUE INDEX jobs_dedupe_unique ON public.jobs (dedupe_key)
WHERE
  dedupe_key IS NOT NULL;

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
  recruiter_id UUID NOT NULL REFERENCES public.recruiters (id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs (id) ON DELETE SET NULL,
  amount INTEGER NOT NULL,
  plan public.payment_plan NOT NULL,
  status public.payment_status NOT NULL DEFAULT 'created',
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.saved_jobs (
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, job_id)
);

CREATE TABLE public.job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs (id) ON DELETE CASCADE,
  notes TEXT,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, job_id)
);

-- Trigger: new user -> profile
CREATE OR REPLACE FUNCTION public.handle_new_user ()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    'candidate'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user ();

CREATE OR REPLACE FUNCTION public.set_updated_at ()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated
BEFORE UPDATE ON public.profiles FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at ();

CREATE TRIGGER recruiters_updated
BEFORE UPDATE ON public.recruiters FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at ();

CREATE TRIGGER jobs_updated
BEFORE UPDATE ON public.jobs FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at ();

CREATE TRIGGER payments_updated
BEFORE UPDATE ON public.payments FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at ();

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.recruiters ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- Helper: is admin
CREATE OR REPLACE FUNCTION public.is_admin ()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE
      p.id = auth.uid ()
      AND p.role = 'admin'
  );
$$;

-- Profiles
CREATE POLICY "profiles_select_own"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid () OR public.is_admin ());

CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid ())
WITH CHECK (id = auth.uid ());

-- Recruiters
CREATE POLICY "recruiters_select_own"
ON public.recruiters FOR SELECT
TO authenticated
USING (user_id = auth.uid () OR public.is_admin ());

CREATE POLICY "recruiters_insert_own"
ON public.recruiters FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid ());

CREATE POLICY "recruiters_update_own"
ON public.recruiters FOR UPDATE
TO authenticated
USING (user_id = auth.uid ())
WITH CHECK (user_id = auth.uid ());

-- Jobs: SELECT (public published + own drafts + admin)
CREATE POLICY "jobs_select"
ON public.jobs FOR SELECT
USING (
  (
    status = 'published'
    AND (expires_at IS NULL OR expires_at > now ())
  )
  OR public.is_admin ()
  OR (
    recruiter_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.recruiters r
      WHERE
        r.id = jobs.recruiter_id
        AND r.user_id = auth.uid ()
    )
  )
);

CREATE POLICY "jobs_insert"
ON public.jobs FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin ()
  OR (
    recruiter_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.recruiters r
      WHERE
        r.id = jobs.recruiter_id
        AND r.user_id = auth.uid ()
    )
  )
);

CREATE POLICY "jobs_update"
ON public.jobs FOR UPDATE
TO authenticated
USING (
  public.is_admin ()
  OR EXISTS (
    SELECT 1
    FROM public.recruiters r
    WHERE
      r.id = jobs.recruiter_id
      AND r.user_id = auth.uid ()
  )
)
WITH CHECK (
  public.is_admin ()
  OR (
    recruiter_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.recruiters r
      WHERE
        r.id = jobs.recruiter_id
        AND r.user_id = auth.uid ()
    )
  )
);

CREATE POLICY "jobs_delete"
ON public.jobs FOR DELETE
TO authenticated
USING (
  public.is_admin ()
  OR EXISTS (
    SELECT 1
    FROM public.recruiters r
    WHERE
      r.id = jobs.recruiter_id
      AND r.user_id = auth.uid ()
  )
);

-- Payments: recruiters see own; admin all (service role bypasses RLS)
CREATE POLICY "payments_select"
ON public.payments FOR SELECT
TO authenticated
USING (
  public.is_admin ()
  OR EXISTS (
    SELECT 1
    FROM public.recruiters r
    WHERE
      r.id = payments.recruiter_id
      AND r.user_id = auth.uid ()
  )
);

-- No client insert on payments (server only) — deny default, no insert policy for authenticated

-- saved_jobs
CREATE POLICY "saved_jobs_own"
ON public.saved_jobs FOR ALL
TO authenticated
USING (user_id = auth.uid ())
WITH CHECK (user_id = auth.uid ());

-- job_applications
CREATE POLICY "job_applications_own"
ON public.job_applications FOR ALL
TO authenticated
USING (user_id = auth.uid ())
WITH CHECK (user_id = auth.uid ());

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON public.jobs TO anon;

GRANT SELECT, UPDATE ON public.profiles TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.recruiters TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;

GRANT SELECT ON public.payments TO authenticated;

GRANT SELECT, INSERT, DELETE ON public.saved_jobs TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_applications TO authenticated;

COMMENT ON TABLE public.jobs IS 'Beonely job listings';
