-- Email automations + unified send log for transactional and campaign analytics.

CREATE TABLE IF NOT EXISTS public.email_automation_rules (
  trigger_key TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.email_automation_rules (trigger_key, enabled)
VALUES
  ('candidate_signup', true),
  ('recruiter_signup', true),
  ('job_submitted', true),
  ('job_approved', true),
  ('job_rejected', true),
  ('application_received', true),
  ('application_confirmation', true),
  ('payment_received', true)
ON CONFLICT (trigger_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.email_send_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_key TEXT,
  campaign_id UUID REFERENCES public.email_campaigns (id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  recipient_role TEXT NOT NULL DEFAULT 'unknown',
  subject TEXT,
  resend_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_send_log_created_at_idx
ON public.email_send_log (created_at DESC);

CREATE INDEX IF NOT EXISTS email_send_log_trigger_key_idx
ON public.email_send_log (trigger_key)
WHERE trigger_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS email_send_log_resend_message_id_idx
ON public.email_send_log (resend_message_id)
WHERE resend_message_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS email_send_log_dedupe_idx
ON public.email_send_log ((metadata->>'dedupe_key'))
WHERE metadata->>'dedupe_key' IS NOT NULL;

ALTER TABLE public.email_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS email_automation_rules_admin_select ON public.email_automation_rules;
CREATE POLICY email_automation_rules_admin_select
ON public.email_automation_rules FOR SELECT
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS email_send_log_admin_select ON public.email_send_log;
CREATE POLICY email_send_log_admin_select
ON public.email_send_log FOR SELECT
TO authenticated
USING (public.is_admin());
