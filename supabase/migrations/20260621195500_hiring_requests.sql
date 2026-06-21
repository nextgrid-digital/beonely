-- Capture recruiter-side concierge demand from the public /hire page.

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
  source TEXT NOT NULL DEFAULT 'hire_page'
);

CREATE INDEX IF NOT EXISTS hiring_requests_created_at_idx
  ON public.hiring_requests (created_at DESC);

CREATE INDEX IF NOT EXISTS hiring_requests_status_idx
  ON public.hiring_requests (status);

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
