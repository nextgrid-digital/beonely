-- Newsletter addresses are inactive until the owner confirms through email.

ALTER TABLE public.email_subscribers
  ADD COLUMN IF NOT EXISTS pending_opt_in_token UUID,
  ADD COLUMN IF NOT EXISTS pending_opt_in_requested_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS email_subscribers_pending_opt_in_token_key
ON public.email_subscribers (pending_opt_in_token)
WHERE pending_opt_in_token IS NOT NULL;
