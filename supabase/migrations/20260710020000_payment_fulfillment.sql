-- Atomic, idempotent payment fulfillment. Only the service role may call this
-- RPC after Razorpay signature and captured-payment verification.

CREATE OR REPLACE FUNCTION public.fulfill_razorpay_payment(
  p_order_id TEXT,
  p_payment_id TEXT,
  p_expected_amount INTEGER,
  p_plan TEXT,
  p_listing_tier public.listing_tier,
  p_listing_duration public.listing_duration,
  p_featured BOOLEAN,
  p_duration_days INTEGER,
  p_is_renewal BOOLEAN,
  p_is_boost BOOLEAN,
  p_expected_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_job public.jobs%ROWTYPE;
  v_recruiter public.recruiters%ROWTYPE;
  v_new_expiry TIMESTAMPTZ;
  v_kind TEXT;
BEGIN
  IF p_order_id IS NULL OR p_payment_id IS NULL OR p_expected_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_payment_input';
  END IF;
  IF p_duration_days NOT IN (7, 30) THEN
    RAISE EXCEPTION 'invalid_plan_duration';
  END IF;

  SELECT * INTO v_payment
  FROM public.payments
  WHERE razorpay_order_id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment_not_found';
  END IF;

  SELECT * INTO v_recruiter
  FROM public.recruiters
  WHERE id = v_payment.recruiter_id;
  IF NOT FOUND OR v_recruiter.disabled THEN
    RAISE EXCEPTION 'recruiter_not_active';
  END IF;
  IF p_expected_user_id IS NOT NULL
     AND v_recruiter.user_id <> p_expected_user_id THEN
    RAISE EXCEPTION 'payment_owner_mismatch';
  END IF;

  SELECT * INTO v_job
  FROM public.jobs
  WHERE id = v_payment.job_id
  FOR UPDATE;
  IF NOT FOUND OR v_job.recruiter_id <> v_recruiter.id THEN
    RAISE EXCEPTION 'payment_job_mismatch';
  END IF;
  IF v_payment.amount <> p_expected_amount OR upper(v_payment.currency) <> 'INR' THEN
    RAISE EXCEPTION 'payment_amount_mismatch';
  END IF;

  IF v_payment.status = 'paid' THEN
    IF v_payment.razorpay_payment_id IS DISTINCT FROM p_payment_id THEN
      RAISE EXCEPTION 'payment_already_fulfilled';
    END IF;
    RETURN jsonb_build_object(
      'ok', true,
      'replayed', true,
      'job_id', v_job.id,
      'kind', CASE
        WHEN p_is_renewal THEN 'renewal'
        WHEN p_is_boost THEN 'boost'
        ELSE 'initial'
      END,
      'featured', v_job.featured,
      'expires_at', v_job.listing_expires_at,
      'recruiter_email', v_recruiter.email,
      'company_name', v_recruiter.company_name,
      'plan', p_plan
    );
  END IF;
  IF v_payment.status <> 'unpaid' THEN
    RAISE EXCEPTION 'payment_not_payable';
  END IF;

  IF p_is_renewal THEN
    IF v_job.approval_status <> 'approved'
       OR v_job.payment_status <> 'paid'
       OR v_job.listing_expires_at IS NULL
       OR v_job.listing_expires_at < now() - interval '30 days'
       OR v_job.listing_expires_at > now() + interval '7 days' THEN
      RAISE EXCEPTION 'renewal_not_allowed';
    END IF;
    v_kind := 'renewal';
  ELSIF p_is_boost THEN
    IF NOT p_featured
       OR v_job.approval_status <> 'approved'
       OR v_job.payment_status <> 'paid'
       OR (v_job.listing_expires_at IS NOT NULL AND v_job.listing_expires_at <= now()) THEN
      RAISE EXCEPTION 'boost_not_allowed';
    END IF;
    v_kind := 'boost';
  ELSE
    IF v_job.approval_status <> 'pending' OR v_job.payment_status <> 'unpaid' THEN
      RAISE EXCEPTION 'initial_payment_not_allowed';
    END IF;
    v_kind := 'initial';
  END IF;

  UPDATE public.payments
  SET status = 'paid', razorpay_payment_id = p_payment_id
  WHERE id = v_payment.id;

  IF v_kind IN ('renewal', 'boost') THEN
    v_new_expiry := greatest(
      COALESCE(v_job.listing_expires_at, now()),
      now()
    ) + make_interval(days => p_duration_days);

    UPDATE public.jobs
    SET
      listing_tier = p_listing_tier,
      listing_duration = p_listing_duration,
      featured = p_featured,
      featured_expiry = CASE WHEN p_featured THEN v_new_expiry ELSE NULL END,
      listing_expires_at = v_new_expiry
    WHERE id = v_job.id;
  ELSE
    UPDATE public.jobs
    SET
      payment_status = 'paid',
      listing_tier = p_listing_tier,
      listing_duration = p_listing_duration,
      featured = p_featured,
      featured_expiry = NULL
    WHERE id = v_job.id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'replayed', false,
    'job_id', v_job.id,
    'kind', v_kind,
    'featured', p_featured,
    'expires_at', v_new_expiry,
    'recruiter_email', v_recruiter.email,
    'company_name', v_recruiter.company_name,
    'plan', p_plan
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fulfill_razorpay_payment(
  TEXT,
  TEXT,
  INTEGER,
  TEXT,
  public.listing_tier,
  public.listing_duration,
  BOOLEAN,
  INTEGER,
  BOOLEAN,
  BOOLEAN,
  UUID
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.fulfill_razorpay_payment(
  TEXT,
  TEXT,
  INTEGER,
  TEXT,
  public.listing_tier,
  public.listing_duration,
  BOOLEAN,
  INTEGER,
  BOOLEAN,
  BOOLEAN,
  UUID
) TO service_role;
