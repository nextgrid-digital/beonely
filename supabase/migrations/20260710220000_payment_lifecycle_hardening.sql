-- Payment lifecycle hardening.
--
-- New checkouts are reserved locally before a Razorpay order is created. This
-- gives each attempt an immutable commercial snapshot, a unique receipt, and
-- a single active attempt per job/payment kind. Provider lifecycle events are
-- recorded idempotently and risky reversals are held for manual review instead
-- of silently removing a recruiter's listing entitlement.

DO $$
BEGIN
  CREATE TYPE public.payment_kind AS ENUM ('initial', 'renewal', 'boost');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS plan public.payment_plan,
  ADD COLUMN IF NOT EXISTS payment_kind public.payment_kind,
  ADD COLUMN IF NOT EXISTS provider_receipt TEXT,
  ADD COLUMN IF NOT EXISTS checkout_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS provisioning_token UUID,
  ADD COLUMN IF NOT EXISTS provisioning_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checkout_version SMALLINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS entitlement_applied_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS entitlement_withheld_reason TEXT,
  ADD COLUMN IF NOT EXISTS last_failure_code TEXT,
  ADD COLUMN IF NOT EXISTS last_failure_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refunded_amount INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS chargeback_amount INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS risk_status TEXT,
  ADD COLUMN IF NOT EXISTS requires_manual_review BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS provider_event_at TIMESTAMPTZ;

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_refunded_amount_check,
  DROP CONSTRAINT IF EXISTS payments_chargeback_amount_check,
  ADD CONSTRAINT payments_refunded_amount_check
    CHECK (refunded_amount >= 0 AND refunded_amount <= amount),
  ADD CONSTRAINT payments_chargeback_amount_check
    CHECK (chargeback_amount >= 0 AND chargeback_amount <= amount);

-- Preserve old rows while making their provenance explicit. Exact historical
-- prices are mapped first; unmatched legacy amounts are marked for review.
UPDATE public.payments
SET plan = CASE amount
  WHEN 460200 THEN 'standard_week'::public.payment_plan
  WHEN 1758200 THEN 'standard_month'::public.payment_plan
  WHEN 566400 THEN 'featured_week'::public.payment_plan
  WHEN 2218400 THEN 'featured_month'::public.payment_plan
  WHEN 276120 THEN 'standard_week_renew'::public.payment_plan
  WHEN 1054920 THEN 'standard_month_renew'::public.payment_plan
  WHEN 339840 THEN 'featured_week_renew'::public.payment_plan
  WHEN 1331040 THEN 'featured_month_renew'::public.payment_plan
  ELSE 'standard_week'::public.payment_plan
END
WHERE plan IS NULL;

UPDATE public.payments
SET
  requires_manual_review = true,
  risk_status = COALESCE(risk_status, 'legacy_amount_snapshot_assumed')
WHERE checkout_version = 1
  AND amount NOT IN (460200, 1758200, 566400, 2218400, 276120, 1054920, 339840, 1331040);

UPDATE public.payments
SET payment_kind = CASE
  WHEN plan::TEXT LIKE '%\_renew' ESCAPE '\' THEN 'renewal'::public.payment_kind
  ELSE 'initial'::public.payment_kind
END
WHERE payment_kind IS NULL;

UPDATE public.payments
SET
  provider_receipt = COALESCE(provider_receipt, 'pay_' || REPLACE(id::TEXT, '-', '')),
  checkout_expires_at = COALESCE(checkout_expires_at, created_at + interval '30 minutes'),
  refunded_amount = CASE
    WHEN status = 'refunded' THEN amount
    ELSE refunded_amount
  END,
  paid_at = CASE
    WHEN status IN ('paid', 'refunded') THEN COALESCE(paid_at, created_at)
    ELSE paid_at
  END,
  entitlement_applied_at = CASE
    WHEN status IN ('paid', 'refunded') THEN COALESCE(entitlement_applied_at, created_at)
    ELSE entitlement_applied_at
  END,
  updated_at = COALESCE(updated_at, created_at);

UPDATE public.payments
SET
  requires_manual_review = true,
  risk_status = COALESCE(risk_status, 'legacy_refund')
WHERE status = 'refunded';

ALTER TABLE public.payments
  ALTER COLUMN plan SET NOT NULL,
  ALTER COLUMN payment_kind SET NOT NULL,
  ALTER COLUMN provider_receipt SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN checkout_version SET DEFAULT 2;

CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_receipt_key
ON public.payments (provider_receipt);

-- A historical database may contain several abandoned unpaid attempts. Keep
-- the newest one and close older attempts before applying the active invariant.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY job_id, payment_kind
      ORDER BY created_at DESC, id DESC
    ) AS row_number
  FROM public.payments
  WHERE status = 'unpaid'
)
UPDATE public.payments AS payment
SET
  status = 'failed',
  last_failure_code = 'superseded_during_payment_hardening',
  last_failure_at = now(),
  updated_at = now()
FROM ranked
WHERE ranked.id = payment.id
  AND ranked.row_number > 1;

CREATE UNIQUE INDEX IF NOT EXISTS payments_one_active_kind_per_job_key
ON public.payments (job_id, payment_kind)
WHERE status = 'unpaid';

CREATE INDEX IF NOT EXISTS payments_paid_at_idx
ON public.payments (paid_at DESC)
WHERE paid_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS payments_manual_review_idx
ON public.payments (updated_at DESC)
WHERE requires_manual_review;

CREATE TABLE IF NOT EXISTS public.payment_provider_events (
  provider TEXT NOT NULL DEFAULT 'razorpay',
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  processing_status TEXT NOT NULL DEFAULT 'processing'
    CHECK (processing_status IN ('processing', 'processed', 'failed')),
  provider_entity_id TEXT,
  provider_payment_id TEXT,
  provider_order_id TEXT,
  payment_record_id UUID REFERENCES public.payments (id) ON DELETE SET NULL,
  provider_event_at TIMESTAMPTZ,
  action_taken TEXT,
  error_code TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 1 CHECK (attempt_count > 0),
  requires_manual_review BOOLEAN NOT NULL DEFAULT false,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, event_id)
);

ALTER TABLE public.payment_provider_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.payment_provider_events FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.protect_payment_commercial_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.recruiter_id IS DISTINCT FROM OLD.recruiter_id
     OR NEW.job_id IS DISTINCT FROM OLD.job_id
     OR NEW.amount IS DISTINCT FROM OLD.amount
     OR NEW.currency IS DISTINCT FROM OLD.currency
     OR NEW.plan IS DISTINCT FROM OLD.plan
     OR NEW.payment_kind IS DISTINCT FROM OLD.payment_kind
     OR NEW.provider_receipt IS DISTINCT FROM OLD.provider_receipt
     OR NEW.checkout_version IS DISTINCT FROM OLD.checkout_version THEN
    RAISE EXCEPTION 'payment_commercial_snapshot_is_immutable';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_payment_commercial_snapshot ON public.payments;
CREATE TRIGGER protect_payment_commercial_snapshot
BEFORE UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.protect_payment_commercial_snapshot();

CREATE OR REPLACE FUNCTION public.block_job_rejection_with_open_checkout()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.approval_status = 'rejected'
     AND OLD.approval_status IS DISTINCT FROM 'rejected'
     AND EXISTS (
       SELECT 1
       FROM public.payments AS payment
       WHERE payment.job_id = OLD.id
         AND payment.status = 'unpaid'
         AND payment.checkout_expires_at > now()
     ) THEN
    RAISE EXCEPTION 'job_has_outstanding_payment_order';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS block_job_rejection_with_open_checkout ON public.jobs;
CREATE TRIGGER block_job_rejection_with_open_checkout
BEFORE UPDATE OF approval_status ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.block_job_rejection_with_open_checkout();

CREATE OR REPLACE FUNCTION public.reserve_payment_checkout(
  p_job_id UUID,
  p_recruiter_id UUID,
  p_plan public.payment_plan,
  p_payment_kind public.payment_kind,
  p_amount INTEGER,
  p_currency TEXT,
  p_expected_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  payment public.payments%ROWTYPE;
  job public.jobs%ROWTYPE;
  recruiter public.recruiters%ROWTYPE;
  new_id UUID;
  new_token UUID;
  expected_amount INTEGER;
  normalized_currency TEXT := UPPER(BTRIM(p_currency));
BEGIN
  IF COALESCE((SELECT auth.role()), '') <> 'service_role' THEN
    RAISE EXCEPTION 'service_role_required' USING ERRCODE = '42501';
  END IF;
  expected_amount := CASE p_plan
    WHEN 'standard_week'::public.payment_plan THEN 460200
    WHEN 'standard_month'::public.payment_plan THEN 1758200
    WHEN 'featured_week'::public.payment_plan THEN 566400
    WHEN 'featured_month'::public.payment_plan THEN 2218400
    WHEN 'standard_week_renew'::public.payment_plan THEN 276120
    WHEN 'standard_month_renew'::public.payment_plan THEN 1054920
    WHEN 'featured_week_renew'::public.payment_plan THEN 339840
    WHEN 'featured_month_renew'::public.payment_plan THEN 1331040
    ELSE NULL
  END;
  IF p_expected_user_id IS NULL
     OR p_payment_kind IS NULL
     OR expected_amount IS NULL
     OR p_amount IS DISTINCT FROM expected_amount
     OR normalized_currency IS DISTINCT FROM 'INR' THEN
    RAISE EXCEPTION 'invalid_payment_snapshot';
  END IF;

  SELECT * INTO recruiter
  FROM public.recruiters
  WHERE id = p_recruiter_id
  FOR UPDATE;
  IF NOT FOUND OR recruiter.disabled OR recruiter.user_id <> p_expected_user_id THEN
    RAISE EXCEPTION 'payment_owner_mismatch';
  END IF;

  SELECT * INTO job
  FROM public.jobs
  WHERE id = p_job_id
  FOR UPDATE;
  IF NOT FOUND OR job.recruiter_id <> recruiter.id THEN
    RAISE EXCEPTION 'payment_job_mismatch';
  END IF;

  IF p_payment_kind = 'initial' THEN
    IF p_plan::TEXT LIKE '%\_renew' ESCAPE '\'
       OR job.approval_status <> 'pending'
       OR job.payment_status <> 'unpaid' THEN
      RAISE EXCEPTION 'job_not_payable';
    END IF;
  ELSIF p_payment_kind = 'renewal' THEN
    IF p_plan::TEXT NOT LIKE '%\_renew' ESCAPE '\'
       OR job.approval_status <> 'approved'
       OR job.payment_status <> 'paid'
       OR job.listing_expires_at IS NULL
       OR job.listing_expires_at < now() - interval '30 days'
       OR job.listing_expires_at > now() + interval '7 days' THEN
      RAISE EXCEPTION 'job_not_payable';
    END IF;
  ELSE
    IF p_plan::TEXT LIKE '%\_renew' ESCAPE '\'
       OR p_plan::TEXT NOT LIKE 'featured%'
       OR job.approval_status <> 'approved'
       OR job.payment_status <> 'paid'
       OR (job.listing_expires_at IS NOT NULL AND job.listing_expires_at <= now()) THEN
      RAISE EXCEPTION 'job_not_payable';
    END IF;
  END IF;

  UPDATE public.payments
  SET
    status = 'failed',
    last_failure_code = 'checkout_expired',
    last_failure_at = now(),
    provisioning_token = NULL,
    provisioning_started_at = NULL
  WHERE job_id = job.id
    AND payment_kind = p_payment_kind
    AND status = 'unpaid'
    AND checkout_expires_at <= now();

  SELECT * INTO payment
  FROM public.payments
  WHERE job_id = job.id
    AND payment_kind = p_payment_kind
    AND status = 'unpaid'
  FOR UPDATE;

  IF FOUND THEN
    IF payment.plan <> p_plan
       OR payment.amount <> p_amount
       OR UPPER(payment.currency) <> normalized_currency THEN
      RAISE EXCEPTION 'checkout_plan_conflict';
    END IF;

    IF payment.razorpay_order_id IS NULL
       AND (
         payment.provisioning_started_at IS NULL
         OR payment.provisioning_started_at <= now() - interval '90 seconds'
       ) THEN
      new_token := gen_random_uuid();
      UPDATE public.payments
      SET
        provisioning_token = new_token,
        provisioning_started_at = now(),
        last_failure_code = NULL,
        last_failure_at = NULL
      WHERE id = payment.id
      RETURNING * INTO payment;
    END IF;

    RETURN jsonb_build_object(
      'payment_id', payment.id,
      'provider_receipt', payment.provider_receipt,
      'provider_order_id', payment.razorpay_order_id,
      'amount', payment.amount,
      'currency', payment.currency,
      'plan', payment.plan,
      'payment_kind', payment.payment_kind,
      'checkout_expires_at', payment.checkout_expires_at,
      'provisioning_token', new_token,
      'provisioning', payment.razorpay_order_id IS NULL AND new_token IS NULL,
      'reused', true
    );
  END IF;

  new_id := gen_random_uuid();
  new_token := gen_random_uuid();
  INSERT INTO public.payments (
    id,
    recruiter_id,
    job_id,
    amount,
    currency,
    status,
    plan,
    payment_kind,
    provider_receipt,
    checkout_expires_at,
    provisioning_token,
    provisioning_started_at,
    checkout_version
  ) VALUES (
    new_id,
    recruiter.id,
    job.id,
    p_amount,
    normalized_currency,
    'unpaid',
    p_plan,
    p_payment_kind,
    'pay_' || REPLACE(new_id::TEXT, '-', ''),
    now() + interval '30 minutes',
    new_token,
    now(),
    2
  )
  RETURNING * INTO payment;

  RETURN jsonb_build_object(
    'payment_id', payment.id,
    'provider_receipt', payment.provider_receipt,
    'provider_order_id', NULL,
    'amount', payment.amount,
    'currency', payment.currency,
    'plan', payment.plan,
    'payment_kind', payment.payment_kind,
    'checkout_expires_at', payment.checkout_expires_at,
    'provisioning_token', new_token,
    'provisioning', false,
    'reused', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_payment_checkout(
  UUID, UUID, public.payment_plan, public.payment_kind, INTEGER, TEXT, UUID
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_payment_checkout(
  UUID, UUID, public.payment_plan, public.payment_kind, INTEGER, TEXT, UUID
) TO service_role;

CREATE OR REPLACE FUNCTION public.bind_razorpay_order(
  p_payment_id UUID,
  p_provisioning_token UUID,
  p_order_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  payment public.payments%ROWTYPE;
BEGIN
  IF COALESCE((SELECT auth.role()), '') <> 'service_role' THEN
    RAISE EXCEPTION 'service_role_required' USING ERRCODE = '42501';
  END IF;
  IF NULLIF(BTRIM(p_order_id), '') IS NULL THEN
    RAISE EXCEPTION 'invalid_provider_order';
  END IF;

  SELECT * INTO payment
  FROM public.payments
  WHERE id = p_payment_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment_not_found';
  END IF;
  IF payment.razorpay_order_id IS NOT NULL THEN
    IF payment.razorpay_order_id <> p_order_id THEN
      RAISE EXCEPTION 'payment_order_already_bound';
    END IF;
    RETURN jsonb_build_object('ok', true, 'replayed', true);
  END IF;
  IF payment.status <> 'unpaid'
     OR payment.provisioning_token IS DISTINCT FROM p_provisioning_token
     OR payment.checkout_expires_at <= now() - interval '5 minutes' THEN
    RAISE EXCEPTION 'payment_order_binding_not_allowed';
  END IF;

  UPDATE public.payments
  SET
    razorpay_order_id = p_order_id,
    provisioning_token = NULL,
    provisioning_started_at = NULL,
    last_failure_code = NULL,
    last_failure_at = NULL
  WHERE id = payment.id;

  RETURN jsonb_build_object('ok', true, 'replayed', false);
END;
$$;

REVOKE ALL ON FUNCTION public.bind_razorpay_order(UUID, UUID, TEXT)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bind_razorpay_order(UUID, UUID, TEXT)
TO service_role;

CREATE OR REPLACE FUNCTION public.fulfill_razorpay_payment_v2(
  p_order_id TEXT,
  p_payment_id TEXT,
  p_paid_at TIMESTAMPTZ,
  p_expected_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  payment public.payments%ROWTYPE;
  job public.jobs%ROWTYPE;
  recruiter public.recruiters%ROWTYPE;
  existing_payment UUID;
  duration_days INTEGER;
  is_featured BOOLEAN;
  new_expiry TIMESTAMPTZ;
  applied BOOLEAN := false;
  withheld_reason TEXT;
  normalized_paid_at TIMESTAMPTZ := LEAST(COALESCE(p_paid_at, now()), now());
BEGIN
  IF COALESCE((SELECT auth.role()), '') <> 'service_role' THEN
    RAISE EXCEPTION 'service_role_required' USING ERRCODE = '42501';
  END IF;
  IF NULLIF(BTRIM(p_order_id), '') IS NULL
     OR NULLIF(BTRIM(p_payment_id), '') IS NULL THEN
    RAISE EXCEPTION 'invalid_payment_input';
  END IF;

  SELECT * INTO payment
  FROM public.payments
  WHERE razorpay_order_id = p_order_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment_not_found';
  END IF;

  SELECT * INTO recruiter
  FROM public.recruiters
  WHERE id = payment.recruiter_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'recruiter_not_active';
  END IF;
  IF p_expected_user_id IS NOT NULL AND recruiter.user_id <> p_expected_user_id THEN
    RAISE EXCEPTION 'payment_owner_mismatch';
  END IF;

  SELECT * INTO job
  FROM public.jobs
  WHERE id = payment.job_id
  FOR UPDATE;
  IF NOT FOUND OR job.recruiter_id <> recruiter.id THEN
    RAISE EXCEPTION 'payment_job_mismatch';
  END IF;

  IF payment.razorpay_payment_id = p_payment_id AND payment.paid_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', true,
      'replayed', true,
      'payment_record_id', payment.id,
      'job_id', job.id,
      'kind', payment.payment_kind,
      'featured', job.featured,
      'expires_at', job.listing_expires_at,
      'recruiter_email', recruiter.email,
      'company_name', recruiter.company_name,
      'job_title', job.job_title,
      'plan', payment.plan,
      'manual_review', payment.requires_manual_review,
      'entitlement_applied', payment.entitlement_applied_at IS NOT NULL,
      'withheld_reason', payment.entitlement_withheld_reason
    );
  END IF;

  SELECT id INTO existing_payment
  FROM public.payments
  WHERE razorpay_payment_id = p_payment_id
    AND id <> payment.id;
  IF FOUND THEN
    UPDATE public.payments
    SET
      status = CASE
        WHEN status = 'refunded' THEN 'refunded'::public.payment_status
        ELSE 'paid'::public.payment_status
      END,
      paid_at = COALESCE(paid_at, normalized_paid_at),
      requires_manual_review = true,
      risk_status = 'provider_payment_reused',
      entitlement_withheld_reason = 'provider_payment_reused',
      provider_event_at = normalized_paid_at
    WHERE id = payment.id;
    withheld_reason := 'provider_payment_reused';
  ELSIF recruiter.disabled THEN
    -- The provider capture is authoritative financial history even when the
    -- account became ineligible after checkout. Record the money movement,
    -- withhold the entitlement, and surface the row for reconciliation.
    UPDATE public.payments
    SET
      status = CASE
        WHEN status = 'refunded' THEN 'refunded'::public.payment_status
        ELSE 'paid'::public.payment_status
      END,
      razorpay_payment_id = COALESCE(razorpay_payment_id, p_payment_id),
      paid_at = COALESCE(paid_at, normalized_paid_at),
      provider_event_at = normalized_paid_at,
      requires_manual_review = true,
      risk_status = 'recruiter_disabled_at_capture',
      entitlement_withheld_reason = 'recruiter_disabled_at_capture'
    WHERE id = payment.id;
    withheld_reason := 'recruiter_disabled_at_capture';
  ELSIF payment.status <> 'unpaid' THEN
    UPDATE public.payments
    SET
      status = CASE
        WHEN status = 'refunded' THEN 'refunded'::public.payment_status
        ELSE 'paid'::public.payment_status
      END,
      requires_manual_review = true,
      risk_status = 'capture_for_closed_checkout',
      entitlement_withheld_reason = 'capture_for_closed_checkout',
      razorpay_payment_id = COALESCE(razorpay_payment_id, p_payment_id),
      paid_at = COALESCE(paid_at, normalized_paid_at),
      provider_event_at = normalized_paid_at
    WHERE id = payment.id;
    withheld_reason := 'capture_for_closed_checkout';
  ELSIF payment.checkout_expires_at <= now() - interval '5 minutes' THEN
    UPDATE public.payments
    SET
      status = 'paid',
      razorpay_payment_id = p_payment_id,
      paid_at = normalized_paid_at,
      provider_event_at = normalized_paid_at,
      requires_manual_review = true,
      risk_status = 'late_capture',
      entitlement_withheld_reason = 'late_capture'
    WHERE id = payment.id;
    withheld_reason := 'late_capture';
  ELSIF payment.payment_kind = 'initial'
        AND (job.approval_status <> 'pending' OR job.payment_status <> 'unpaid') THEN
    UPDATE public.payments
    SET
      status = 'paid',
      razorpay_payment_id = p_payment_id,
      paid_at = normalized_paid_at,
      provider_event_at = normalized_paid_at,
      requires_manual_review = true,
      risk_status = 'duplicate_capture',
      entitlement_withheld_reason = 'duplicate_capture'
    WHERE id = payment.id;
    withheld_reason := 'duplicate_capture';
  ELSIF payment.payment_kind = 'renewal'
        AND (
          job.approval_status <> 'approved'
          OR job.payment_status <> 'paid'
          OR job.listing_expires_at IS NULL
          OR job.listing_expires_at < now() - interval '30 days'
          OR job.listing_expires_at > now() + interval '7 days'
        ) THEN
    UPDATE public.payments
    SET
      status = 'paid',
      razorpay_payment_id = p_payment_id,
      paid_at = normalized_paid_at,
      provider_event_at = normalized_paid_at,
      requires_manual_review = true,
      risk_status = 'stale_renewal_capture',
      entitlement_withheld_reason = 'stale_renewal_capture'
    WHERE id = payment.id;
    withheld_reason := 'stale_renewal_capture';
  ELSIF payment.payment_kind = 'boost'
        AND (
          job.approval_status <> 'approved'
          OR job.payment_status <> 'paid'
          OR (job.listing_expires_at IS NOT NULL AND job.listing_expires_at <= now())
        ) THEN
    UPDATE public.payments
    SET
      status = 'paid',
      razorpay_payment_id = p_payment_id,
      paid_at = normalized_paid_at,
      provider_event_at = normalized_paid_at,
      requires_manual_review = true,
      risk_status = 'stale_boost_capture',
      entitlement_withheld_reason = 'stale_boost_capture'
    WHERE id = payment.id;
    withheld_reason := 'stale_boost_capture';
  ELSE
    duration_days := CASE WHEN payment.plan::TEXT LIKE '%week%' THEN 7 ELSE 30 END;
    is_featured := payment.plan::TEXT LIKE 'featured%';

    UPDATE public.payments
    SET
      status = 'paid',
      razorpay_payment_id = p_payment_id,
      paid_at = normalized_paid_at,
      provider_event_at = normalized_paid_at,
      entitlement_applied_at = now(),
      entitlement_withheld_reason = NULL,
      requires_manual_review = false,
      risk_status = NULL
    WHERE id = payment.id;

    IF payment.payment_kind IN ('renewal', 'boost') THEN
      new_expiry := GREATEST(COALESCE(job.listing_expires_at, now()), now())
        + make_interval(days => duration_days);
      UPDATE public.jobs
      SET
        listing_tier = CASE WHEN is_featured THEN 'featured'::public.listing_tier ELSE 'standard'::public.listing_tier END,
        listing_duration = CASE WHEN duration_days = 30 THEN 'monthly'::public.listing_duration ELSE 'weekly'::public.listing_duration END,
        featured = is_featured,
        featured_expiry = CASE WHEN is_featured THEN new_expiry ELSE NULL END,
        listing_expires_at = new_expiry
      WHERE id = job.id;
    ELSE
      UPDATE public.jobs
      SET
        payment_status = 'paid',
        listing_tier = CASE WHEN is_featured THEN 'featured'::public.listing_tier ELSE 'standard'::public.listing_tier END,
        listing_duration = CASE WHEN duration_days = 30 THEN 'monthly'::public.listing_duration ELSE 'weekly'::public.listing_duration END,
        featured = is_featured,
        featured_expiry = NULL
      WHERE id = job.id;
    END IF;
    applied := true;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'replayed', false,
    'payment_record_id', payment.id,
    'job_id', job.id,
    'kind', payment.payment_kind,
    'featured', CASE WHEN applied THEN is_featured ELSE job.featured END,
    'expires_at', CASE WHEN applied AND payment.payment_kind IN ('renewal', 'boost') THEN new_expiry ELSE job.listing_expires_at END,
    'recruiter_email', recruiter.email,
    'company_name', recruiter.company_name,
    'job_title', job.job_title,
    'plan', payment.plan,
    'manual_review', NOT applied,
    'entitlement_applied', applied,
    'withheld_reason', withheld_reason
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fulfill_razorpay_payment_v2(TEXT, TEXT, TIMESTAMPTZ, UUID)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_razorpay_payment_v2(TEXT, TEXT, TIMESTAMPTZ, UUID)
TO service_role;

CREATE OR REPLACE FUNCTION public.claim_razorpay_webhook_event(
  p_event_id TEXT,
  p_event_type TEXT,
  p_event_at TIMESTAMPTZ,
  p_provider_entity_id TEXT,
  p_provider_payment_id TEXT,
  p_provider_order_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  event public.payment_provider_events%ROWTYPE;
  inserted_count INTEGER;
BEGIN
  IF COALESCE((SELECT auth.role()), '') <> 'service_role' THEN
    RAISE EXCEPTION 'service_role_required' USING ERRCODE = '42501';
  END IF;
  IF NULLIF(BTRIM(p_event_id), '') IS NULL OR LENGTH(p_event_id) > 200
     OR NULLIF(BTRIM(p_event_type), '') IS NULL OR LENGTH(p_event_type) > 120 THEN
    RAISE EXCEPTION 'invalid_webhook_event';
  END IF;

  INSERT INTO public.payment_provider_events (
    provider,
    event_id,
    event_type,
    provider_entity_id,
    provider_payment_id,
    provider_order_id,
    provider_event_at
  ) VALUES (
    'razorpay',
    p_event_id,
    p_event_type,
    p_provider_entity_id,
    p_provider_payment_id,
    p_provider_order_id,
    p_event_at
  )
  ON CONFLICT (provider, event_id) DO NOTHING;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  IF inserted_count = 1 THEN
    RETURN jsonb_build_object('claimed', true, 'replayed', false, 'in_progress', false);
  END IF;

  SELECT * INTO event
  FROM public.payment_provider_events
  WHERE provider = 'razorpay' AND event_id = p_event_id
  FOR UPDATE;

  IF event.processing_status = 'processed' THEN
    RETURN jsonb_build_object('claimed', false, 'replayed', true, 'in_progress', false);
  END IF;
  IF event.processing_status = 'processing'
     AND event.updated_at > now() - interval '2 minutes' THEN
    RETURN jsonb_build_object('claimed', false, 'replayed', false, 'in_progress', true);
  END IF;

  -- A just-inserted row is immediately claimable. Failed or stale processing
  -- rows are reclaimed and retain their attempt history.
  UPDATE public.payment_provider_events
  SET
    processing_status = 'processing',
    event_type = p_event_type,
    provider_entity_id = p_provider_entity_id,
    provider_payment_id = p_provider_payment_id,
    provider_order_id = p_provider_order_id,
    provider_event_at = p_event_at,
    error_code = NULL,
    attempt_count = attempt_count + 1,
    updated_at = now()
  WHERE provider = 'razorpay' AND event_id = p_event_id;

  RETURN jsonb_build_object('claimed', true, 'replayed', false, 'in_progress', false);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_razorpay_webhook_event(TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_razorpay_webhook_event(TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT)
TO service_role;

CREATE OR REPLACE FUNCTION public.complete_razorpay_webhook_event(
  p_event_id TEXT,
  p_action TEXT,
  p_payment_record_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF COALESCE((SELECT auth.role()), '') <> 'service_role' THEN
    RAISE EXCEPTION 'service_role_required' USING ERRCODE = '42501';
  END IF;
  UPDATE public.payment_provider_events
  SET
    processing_status = 'processed',
    action_taken = LEFT(p_action, 200),
    payment_record_id = COALESCE(p_payment_record_id, payment_record_id),
    error_code = NULL,
    updated_at = now()
  WHERE provider = 'razorpay' AND event_id = p_event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'webhook_event_not_claimed';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_razorpay_webhook_event(TEXT, TEXT, UUID)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_razorpay_webhook_event(TEXT, TEXT, UUID)
TO service_role;

CREATE OR REPLACE FUNCTION public.fail_razorpay_webhook_event(
  p_event_id TEXT,
  p_error_code TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF COALESCE((SELECT auth.role()), '') <> 'service_role' THEN
    RAISE EXCEPTION 'service_role_required' USING ERRCODE = '42501';
  END IF;
  UPDATE public.payment_provider_events
  SET
    processing_status = 'failed',
    error_code = LEFT(COALESCE(p_error_code, 'processing_failed'), 200),
    updated_at = now()
  WHERE provider = 'razorpay' AND event_id = p_event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.fail_razorpay_webhook_event(TEXT, TEXT)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fail_razorpay_webhook_event(TEXT, TEXT)
TO service_role;

CREATE OR REPLACE FUNCTION public.apply_razorpay_lifecycle_event(
  p_event_id TEXT,
  p_event_type TEXT,
  p_provider_payment_id TEXT,
  p_provider_order_id TEXT,
  p_amount INTEGER,
  p_failure_code TEXT,
  p_event_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  payment public.payments%ROWTYPE;
  action TEXT;
  reversal INTEGER;
BEGIN
  IF COALESCE((SELECT auth.role()), '') <> 'service_role' THEN
    RAISE EXCEPTION 'service_role_required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO payment
  FROM public.payments
  WHERE (p_provider_payment_id IS NOT NULL AND razorpay_payment_id = p_provider_payment_id)
     OR (p_provider_order_id IS NOT NULL AND razorpay_order_id = p_provider_order_id)
  ORDER BY CASE WHEN razorpay_payment_id = p_provider_payment_id THEN 0 ELSE 1 END
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    UPDATE public.payment_provider_events
    SET
      processing_status = 'processed',
      action_taken = 'unmatched_event_recorded',
      requires_manual_review = true,
      updated_at = now()
    WHERE provider = 'razorpay' AND event_id = p_event_id;
    RETURN jsonb_build_object('ok', true, 'matched', false, 'manual_review', true);
  END IF;

  IF p_event_type = 'payment.failed' THEN
    UPDATE public.payments
    SET
      last_failure_code = LEFT(COALESCE(p_failure_code, 'payment_failed'), 200),
      last_failure_at = COALESCE(p_event_at, now()),
      provider_event_at = COALESCE(p_event_at, now()),
      requires_manual_review = CASE WHEN status IN ('paid', 'refunded') THEN true ELSE requires_manual_review END,
      risk_status = CASE WHEN status IN ('paid', 'refunded') THEN 'failure_after_capture' ELSE risk_status END
    WHERE id = payment.id;
    action := 'payment_failure_recorded_checkout_left_retryable';
  ELSIF p_event_type = 'refund.created' THEN
    UPDATE public.payments
    SET
      requires_manual_review = true,
      risk_status = 'refund_pending',
      provider_event_at = COALESCE(p_event_at, now())
    WHERE id = payment.id;
    action := 'refund_pending_manual_review';
  ELSIF p_event_type IN ('refund.processed', 'payment.refunded') THEN
    reversal := LEAST(payment.amount, GREATEST(COALESCE(p_amount, 0), 0));
    UPDATE public.payments
    SET
      refunded_amount = GREATEST(refunded_amount, reversal),
      status = CASE
        WHEN GREATEST(refunded_amount, reversal) >= amount THEN 'refunded'::public.payment_status
        ELSE status
      END,
      requires_manual_review = true,
      risk_status = CASE
        WHEN GREATEST(refunded_amount, reversal) >= amount THEN 'refunded'
        ELSE 'partially_refunded'
      END,
      provider_event_at = COALESCE(p_event_at, now())
    WHERE id = payment.id;
    action := 'refund_recorded_entitlement_held_for_manual_review';
  ELSIF p_event_type = 'refund.failed' THEN
    UPDATE public.payments
    SET
      requires_manual_review = true,
      risk_status = 'refund_failed',
      last_failure_code = LEFT(COALESCE(p_failure_code, 'refund_failed'), 200),
      last_failure_at = COALESCE(p_event_at, now()),
      provider_event_at = COALESCE(p_event_at, now())
    WHERE id = payment.id;
    action := 'refund_failure_recorded_manual_review';
  ELSIF p_event_type LIKE 'payment.dispute.%' THEN
    reversal := LEAST(payment.amount, GREATEST(COALESCE(p_amount, payment.amount), 0));
    UPDATE public.payments
    SET
      chargeback_amount = CASE
        WHEN p_event_type = 'payment.dispute.lost' THEN GREATEST(chargeback_amount, reversal)
        ELSE chargeback_amount
      END,
      requires_manual_review = true,
      risk_status = CASE p_event_type
        WHEN 'payment.dispute.created' THEN 'dispute_open'
        WHEN 'payment.dispute.won' THEN 'dispute_won_review'
        WHEN 'payment.dispute.lost' THEN 'dispute_lost'
        ELSE 'dispute_closed_review'
      END,
      provider_event_at = COALESCE(p_event_at, now())
    WHERE id = payment.id;
    action := 'dispute_recorded_entitlement_held_for_manual_review';
  ELSE
    action := 'event_recorded_no_automatic_action';
  END IF;

  UPDATE public.payment_provider_events
  SET
    processing_status = 'processed',
    action_taken = action,
    payment_record_id = payment.id,
    requires_manual_review = p_event_type LIKE 'refund%'
      OR p_event_type = 'payment.refunded'
      OR p_event_type LIKE 'payment.dispute.%',
    error_code = NULL,
    updated_at = now()
  WHERE provider = 'razorpay' AND event_id = p_event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'webhook_event_not_claimed';
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'matched', true,
    'payment_record_id', payment.id,
    'action', action,
    'manual_review', p_event_type LIKE 'refund%'
      OR p_event_type = 'payment.refunded'
      OR p_event_type LIKE 'payment.dispute.%'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_razorpay_lifecycle_event(TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, TIMESTAMPTZ)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_razorpay_lifecycle_event(TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, TIMESTAMPTZ)
TO service_role;

-- Revenue is recognized at provider capture time and reported net of confirmed
-- refunds/chargebacks. The listing entitlement is deliberately not mutated by
-- those lifecycle events; an admin must resolve the manual-review record.
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  result JSONB;
BEGIN
  IF COALESCE((SELECT auth.role()), '') <> 'service_role'
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'revenue_all_time_inr', COALESCE((
      SELECT SUM(GREATEST(p.amount - LEAST(p.refunded_amount + p.chargeback_amount, p.amount), 0)) / 100.0
      FROM public.payments AS p
      WHERE p.paid_at IS NOT NULL AND UPPER(p.currency) = 'INR'
    ), 0),
    'revenue_30d_inr', COALESCE((
      SELECT SUM(GREATEST(p.amount - LEAST(p.refunded_amount + p.chargeback_amount, p.amount), 0)) / 100.0
      FROM public.payments AS p
      WHERE p.paid_at >= now() - interval '30 days'
        AND UPPER(p.currency) = 'INR'
    ), 0),
    'payments_needing_review', (
      SELECT COUNT(*) FROM public.payments WHERE requires_manual_review
    ),
    'pending_moderation', (
      SELECT COUNT(*)
      FROM public.jobs AS j
      WHERE j.approval_status = 'pending'
        AND (j.payment_status = 'paid' OR j.source_kind = 'linkedin_import')
    ),
    'active_listings', (
      SELECT COUNT(*)
      FROM public.jobs AS j
      WHERE j.approval_status = 'approved'
        AND j.payment_status = 'paid'
        AND (j.listing_expires_at IS NULL OR j.listing_expires_at > now())
    ),
    'recruiter_count', (SELECT COUNT(*) FROM public.recruiters),
    'candidate_count', (SELECT COUNT(*) FROM public.job_seeker_profiles),
    'campaigns_needing_attention', (
      SELECT COUNT(*) FROM public.email_campaigns WHERE status IN ('sending', 'failed')
    ),
    'email_failures_7d', (
      SELECT COUNT(*)
      FROM public.email_send_log
      WHERE status IN ('failed', 'bounced', 'complained')
        AND created_at >= now() - interval '7 days'
    )
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_dashboard_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats() TO authenticated, service_role;
