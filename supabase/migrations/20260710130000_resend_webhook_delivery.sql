-- Make Resend delivery processing replay-safe and monotonic. Resend provides
-- at-least-once, potentially out-of-order delivery, identified by svix-id.

ALTER TABLE public.email_campaign_recipients
  ADD COLUMN IF NOT EXISTS delivery_event_at TIMESTAMPTZ;

ALTER TABLE public.email_send_log
  ADD COLUMN IF NOT EXISTS delivery_event_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.webhook_event_receipts (
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, event_id)
);

ALTER TABLE public.webhook_event_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.webhook_event_receipts FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.apply_resend_delivery_event(
  p_event_id TEXT,
  p_event_type TEXT,
  p_message_id TEXT,
  p_status TEXT,
  p_error_message TEXT,
  p_event_at TIMESTAMPTZ
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
BEGIN
  IF NULLIF(BTRIM(p_event_id), '') IS NULL
     OR NULLIF(BTRIM(p_message_id), '') IS NULL
     OR p_event_at IS NULL
     OR p_status NOT IN ('sent', 'bounced', 'complained') THEN
    RAISE EXCEPTION 'invalid_resend_delivery_event';
  END IF;

  INSERT INTO public.webhook_event_receipts (provider, event_id, event_type)
  VALUES ('resend', p_event_id, p_event_type)
  ON CONFLICT (provider, event_id) DO NOTHING;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  IF inserted_count = 0 THEN
    RETURN jsonb_build_object('ok', true, 'replayed', true);
  END IF;

  UPDATE public.email_campaign_recipients
  SET
    delivery_status = CASE WHEN p_status = 'sent' THEN 'sent'::public.delivery_status ELSE 'failed'::public.delivery_status END,
    error_message = p_error_message,
    sent_at = CASE WHEN p_status = 'sent' THEN COALESCE(sent_at, p_event_at) ELSE sent_at END,
    delivery_event_at = p_event_at
  WHERE resend_message_id = p_message_id
    AND (
      delivery_event_at IS NULL
      OR delivery_event_at < p_event_at
      OR (
        delivery_event_at = p_event_at
        AND p_status IN ('bounced', 'complained')
      )
    );
  GET DIAGNOSTICS recipient_count = ROW_COUNT;

  UPDATE public.email_send_log
  SET
    status = p_status,
    error_message = p_error_message,
    delivery_event_at = p_event_at
  WHERE resend_message_id = p_message_id
    AND (
      delivery_event_at IS NULL
      OR delivery_event_at < p_event_at
      OR (
        delivery_event_at = p_event_at
        AND p_status IN ('bounced', 'complained')
      )
    );
  GET DIAGNOSTICS log_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'ok', true,
    'replayed', false,
    'recipient_updates', recipient_count,
    'log_updates', log_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_resend_delivery_event(
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TIMESTAMPTZ
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.apply_resend_delivery_event(
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TIMESTAMPTZ
) TO service_role;
