-- Claim transactional deliveries before contacting Resend, fence stale workers,
-- and process terminal delivery/suppression events in one database transaction.

ALTER TABLE public.email_send_log
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS attempted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS claim_token UUID,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE public.email_send_log
SET
  attempt_count = CASE WHEN attempt_count = 0 THEN 1 ELSE attempt_count END,
  attempted_at = COALESCE(attempted_at, created_at),
  updated_at = COALESCE(updated_at, created_at)
WHERE attempted_at IS NULL OR attempt_count = 0;

CREATE OR REPLACE FUNCTION public.claim_transactional_email(
  p_trigger_key TEXT,
  p_recipient_email TEXT,
  p_recipient_role TEXT,
  p_subject TEXT,
  p_dedupe_key TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_stale_after_seconds INTEGER DEFAULT 600
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  claimed_at TIMESTAMPTZ := now();
  new_claim_token UUID := gen_random_uuid();
  normalized_email TEXT := lower(btrim(p_recipient_email));
  normalized_metadata JSONB;
  stale_seconds INTEGER := greatest(30, least(COALESCE(p_stale_after_seconds, 600), 86400));
  delivery public.email_send_log%ROWTYPE;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'service_role_required' USING ERRCODE = '42501';
  END IF;
  IF NULLIF(btrim(p_trigger_key), '') IS NULL
     OR NULLIF(normalized_email, '') IS NULL
     OR NULLIF(btrim(p_dedupe_key), '') IS NULL THEN
    RAISE EXCEPTION 'invalid_delivery_claim';
  END IF;
  IF p_metadata IS NOT NULL AND jsonb_typeof(p_metadata) <> 'object' THEN
    RAISE EXCEPTION 'invalid_delivery_metadata';
  END IF;

  normalized_metadata := COALESCE(p_metadata, '{}'::jsonb)
    || jsonb_build_object('dedupe_key', btrim(p_dedupe_key));

  INSERT INTO public.email_send_log (
    trigger_key,
    recipient_email,
    recipient_role,
    subject,
    status,
    error_message,
    metadata,
    attempt_count,
    attempted_at,
    claim_token,
    updated_at
  )
  VALUES (
    btrim(p_trigger_key),
    normalized_email,
    COALESCE(NULLIF(btrim(p_recipient_role), ''), 'unknown'),
    p_subject,
    'pending',
    NULL,
    normalized_metadata,
    1,
    claimed_at,
    new_claim_token,
    claimed_at
  )
  ON CONFLICT ((metadata->>'dedupe_key'))
    WHERE metadata->>'dedupe_key' IS NOT NULL
    DO NOTHING
  RETURNING * INTO delivery;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'claimed', true,
      'log_id', delivery.id,
      'claim_token', delivery.claim_token,
      'attempt_count', delivery.attempt_count
    );
  END IF;

  SELECT *
  INTO delivery
  FROM public.email_send_log
  WHERE metadata->>'dedupe_key' = btrim(p_dedupe_key)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'delivery_claim_conflict';
  END IF;

  IF delivery.status = 'pending'
     AND COALESCE(delivery.attempted_at, delivery.created_at)
       > claimed_at - make_interval(secs => stale_seconds) THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'in_progress');
  END IF;

  IF delivery.status NOT IN ('pending', 'failed', 'skipped') THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'dedupe');
  END IF;

  new_claim_token := gen_random_uuid();
  UPDATE public.email_send_log
  SET
    trigger_key = btrim(p_trigger_key),
    recipient_email = normalized_email,
    recipient_role = COALESCE(NULLIF(btrim(p_recipient_role), ''), 'unknown'),
    subject = p_subject,
    resend_message_id = NULL,
    status = 'pending',
    error_message = NULL,
    metadata = COALESCE(metadata, '{}'::jsonb)
      || (COALESCE(p_metadata, '{}'::jsonb) - 'dedupe_key')
      || jsonb_build_object('dedupe_key', btrim(p_dedupe_key)),
    attempt_count = attempt_count + 1,
    attempted_at = claimed_at,
    claim_token = new_claim_token,
    updated_at = claimed_at
  WHERE id = delivery.id
  RETURNING * INTO delivery;

  RETURN jsonb_build_object(
    'claimed', true,
    'log_id', delivery.id,
    'claim_token', delivery.claim_token,
    'attempt_count', delivery.attempt_count
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.finish_transactional_email(
  p_log_id UUID,
  p_claim_token UUID,
  p_status TEXT,
  p_resend_message_id TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'service_role_required' USING ERRCODE = '42501';
  END IF;
  IF p_log_id IS NULL
     OR p_claim_token IS NULL
     OR p_status NOT IN ('sent', 'failed', 'skipped') THEN
    RAISE EXCEPTION 'invalid_delivery_completion';
  END IF;

  UPDATE public.email_send_log
  SET
    status = p_status,
    resend_message_id = CASE
      WHEN p_status = 'sent' THEN NULLIF(btrim(p_resend_message_id), '')
      ELSE NULL
    END,
    error_message = NULLIF(left(COALESCE(p_error_message, ''), 500), ''),
    claim_token = NULL,
    updated_at = now()
  WHERE id = p_log_id
    AND claim_token = p_claim_token
    AND status = 'pending';
  GET DIAGNOSTICS updated_count = ROW_COUNT;

  RETURN updated_count = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_transactional_email(
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  JSONB,
  INTEGER
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_transactional_email(
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  JSONB,
  INTEGER
) TO service_role;

REVOKE ALL ON FUNCTION public.finish_transactional_email(
  UUID,
  UUID,
  TEXT,
  TEXT,
  TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finish_transactional_email(
  UUID,
  UUID,
  TEXT,
  TEXT,
  TEXT
) TO service_role;

DROP FUNCTION IF EXISTS public.apply_resend_delivery_event(
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TIMESTAMPTZ
);

CREATE FUNCTION public.apply_resend_delivery_event(
  p_event_id TEXT,
  p_event_type TEXT,
  p_message_id TEXT,
  p_status TEXT,
  p_error_message TEXT,
  p_event_at TIMESTAMPTZ,
  p_recipient_email TEXT DEFAULT NULL,
  p_suppress_recipient BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  inserted_count INTEGER;
  recipient_count INTEGER;
  log_count INTEGER;
  subscriber_count INTEGER := 0;
  candidate_count INTEGER := 0;
  recruiter_count INTEGER := 0;
  matched_email TEXT;
  normalized_email TEXT;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'service_role_required' USING ERRCODE = '42501';
  END IF;
  IF NULLIF(btrim(p_event_id), '') IS NULL
     OR NULLIF(btrim(p_message_id), '') IS NULL
     OR p_event_at IS NULL
     OR p_status NOT IN ('sent', 'bounced', 'complained', 'failed', 'suppressed') THEN
    RAISE EXCEPTION 'invalid_resend_delivery_event';
  END IF;

  INSERT INTO public.webhook_event_receipts (provider, event_id, event_type)
  VALUES ('resend', p_event_id, p_event_type)
  ON CONFLICT (provider, event_id) DO NOTHING;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  IF inserted_count = 0 THEN
    RETURN jsonb_build_object('ok', true, 'replayed', true);
  END IF;

  SELECT lower(btrim(recipient_email))
  INTO matched_email
  FROM public.email_send_log
  WHERE resend_message_id = p_message_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF matched_email IS NULL THEN
    SELECT lower(btrim(email))
    INTO matched_email
    FROM public.email_campaign_recipients
    WHERE resend_message_id = p_message_id
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  normalized_email := COALESCE(
    matched_email,
    NULLIF(lower(btrim(p_recipient_email)), '')
  );

  UPDATE public.email_campaign_recipients
  SET
    delivery_status = CASE
      WHEN p_status = 'sent' THEN 'sent'::public.delivery_status
      ELSE 'failed'::public.delivery_status
    END,
    error_message = p_error_message,
    sent_at = CASE
      WHEN p_status = 'sent' THEN COALESCE(sent_at, p_event_at)
      ELSE sent_at
    END,
    delivery_event_at = p_event_at
  WHERE resend_message_id = p_message_id
    AND (
      delivery_event_at IS NULL
      OR delivery_event_at < p_event_at
      OR (
        delivery_event_at = p_event_at
        AND p_status IN ('bounced', 'complained', 'failed', 'suppressed')
      )
    );
  GET DIAGNOSTICS recipient_count = ROW_COUNT;

  UPDATE public.email_send_log
  SET
    status = p_status,
    error_message = p_error_message,
    delivery_event_at = p_event_at,
    updated_at = now()
  WHERE resend_message_id = p_message_id
    AND (
      delivery_event_at IS NULL
      OR delivery_event_at < p_event_at
      OR (
        delivery_event_at = p_event_at
        AND p_status IN ('bounced', 'complained', 'failed', 'suppressed')
      )
    );
  GET DIAGNOSTICS log_count = ROW_COUNT;

  IF p_suppress_recipient AND normalized_email IS NOT NULL THEN
    UPDATE public.email_subscribers
    SET
      unsubscribed_at = COALESCE(unsubscribed_at, p_event_at),
      pending_opt_in_token = NULL,
      pending_opt_in_requested_at = NULL,
      updated_at = now()
    WHERE lower(btrim(email)) = normalized_email;
    GET DIAGNOSTICS subscriber_count = ROW_COUNT;

    UPDATE public.job_seeker_profiles
    SET
      marketing_opt_in = false,
      marketing_opt_in_at = NULL,
      updated_at = now()
    WHERE lower(btrim(email)) = normalized_email;
    GET DIAGNOSTICS candidate_count = ROW_COUNT;

    UPDATE public.recruiters
    SET
      marketing_opt_in = false,
      marketing_opt_in_at = NULL,
      updated_at = now()
    WHERE lower(btrim(email)) = normalized_email;
    GET DIAGNOSTICS recruiter_count = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'replayed', false,
    'recipient_updates', recipient_count,
    'log_updates', log_count,
    'suppressed_email', CASE WHEN p_suppress_recipient THEN normalized_email ELSE NULL END,
    'subscriber_suppressions', subscriber_count,
    'candidate_suppressions', candidate_count,
    'recruiter_suppressions', recruiter_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_resend_delivery_event(
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TIMESTAMPTZ,
  TEXT,
  BOOLEAN
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_resend_delivery_event(
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TIMESTAMPTZ,
  TEXT,
  BOOLEAN
) TO service_role;
