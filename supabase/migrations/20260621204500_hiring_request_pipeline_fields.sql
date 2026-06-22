-- Add internal pipeline fields so hiring requests can be worked as revenue opportunities.

ALTER TABLE public.hiring_requests
  ADD COLUMN IF NOT EXISTS assigned_to_email TEXT,
  ADD COLUMN IF NOT EXISTS internal_notes TEXT,
  ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS hiring_requests_assigned_to_email_idx
  ON public.hiring_requests (assigned_to_email);
