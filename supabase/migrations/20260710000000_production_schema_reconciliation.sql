-- Reconcile the historical production schema before the July hardening chain.
--
-- Production was provisioned from an earlier migration lineage whose payments
-- table did not include the payment_plan enum, and it predates the hiring lead
-- tables. Keep this forward-only and idempotent so existing projects can reach
-- the schema expected by the cumulative July security migrations.

DO $$
BEGIN
  IF to_regtype('public.payment_plan') IS NULL THEN
    CREATE TYPE public.payment_plan AS ENUM (
      'standard_week',
      'standard_month',
      'featured_week',
      'featured_month',
      'standard_week_renew',
      'standard_month_renew',
      'featured_week_renew',
      'featured_month_renew'
    );
  END IF;
END
$$;

ALTER TYPE public.payment_plan ADD VALUE IF NOT EXISTS 'standard_week';
ALTER TYPE public.payment_plan ADD VALUE IF NOT EXISTS 'standard_month';
ALTER TYPE public.payment_plan ADD VALUE IF NOT EXISTS 'featured_week';
ALTER TYPE public.payment_plan ADD VALUE IF NOT EXISTS 'featured_month';
ALTER TYPE public.payment_plan ADD VALUE IF NOT EXISTS 'standard_week_renew';
ALTER TYPE public.payment_plan ADD VALUE IF NOT EXISTS 'standard_month_renew';
ALTER TYPE public.payment_plan ADD VALUE IF NOT EXISTS 'featured_week_renew';
ALTER TYPE public.payment_plan ADD VALUE IF NOT EXISTS 'featured_month_renew';

INSERT INTO public.email_automation_rules (trigger_key, enabled)
VALUES ('listing_expiry_reminder', true)
ON CONFLICT (trigger_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.hiring_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company_website TEXT,
  role_title TEXT NOT NULL,
  hiring_type TEXT NOT NULL,
  work_mode TEXT,
  location TEXT,
  timeline TEXT,
  headcount INTEGER,
  servicenow_scope TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  source TEXT NOT NULL DEFAULT 'hire_page',
  assigned_to_email TEXT,
  internal_notes TEXT,
  last_contacted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS hiring_requests_created_at_idx
  ON public.hiring_requests (created_at DESC);

CREATE INDEX IF NOT EXISTS hiring_requests_status_idx
  ON public.hiring_requests (status);

CREATE INDEX IF NOT EXISTS hiring_requests_assigned_to_email_idx
  ON public.hiring_requests (assigned_to_email);

DROP TRIGGER IF EXISTS hiring_requests_updated ON public.hiring_requests;
CREATE TRIGGER hiring_requests_updated
BEFORE UPDATE ON public.hiring_requests FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.hiring_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hiring_requests_admin_select ON public.hiring_requests;
CREATE POLICY hiring_requests_admin_select
ON public.hiring_requests FOR SELECT
TO authenticated
USING (public.is_admin());
