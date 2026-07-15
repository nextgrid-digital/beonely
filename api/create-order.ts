import type { VercelRequest, VercelResponse } from '@vercel/node'
import { jobListingCanRenew } from './_lib/listing-renewal.js'
import {
  ALL_PAYMENT_PLANS,
  PLAN_AMOUNT_INR_PAISE,
  planIsFeatured,
  planIsRenewal,
  type PaymentPlan,
} from './_lib/plan-helpers.js'
import { isRateLimitError, rateLimitOrThrow } from './_lib/rate-limit.js'
import {
  razorpayCreateOrder,
  razorpayFindOrderByReceipt,
  type RazorpayOrder,
} from './_lib/razorpay-rest.js'
import { readJsonObjectBody } from './_lib/request-json-body.js'
import { getUserFromBearer, tryGetServiceSupabase } from './_lib/supabase.js'
import { verifyTurnstileToken } from './_lib/turnstile.js'

/** UUID shape (matches typical `z.string().uuid()` acceptance). */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const PLANS: readonly PaymentPlan[] = ALL_PAYMENT_PLANS

function parseCreateOrderBody(value: unknown):
  | {
      ok: true
      jobId: string
      plan: PaymentPlan
      turnstileToken: string | undefined
    }
  | { ok: false } {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false }
  }
  const o = value as Record<string, unknown>
  const jobId = o.jobId
  if (typeof jobId !== 'string' || !UUID_RE.test(jobId)) return { ok: false }
  const plan = o.plan
  if (
    typeof plan !== 'string' ||
    !(PLANS as readonly string[]).includes(plan)
  ) {
    return { ok: false }
  }
  let turnstileToken: string | undefined
  if (o.turnstileToken !== undefined) {
    if (typeof o.turnstileToken !== 'string') return { ok: false }
    turnstileToken = o.turnstileToken
  }
  return {
    ok: true,
    jobId,
    plan: plan as PaymentPlan,
    turnstileToken,
  }
}

/** Razorpay minimum order amount (paise). */
const MIN_AMOUNT_PAISE = 100

type PaymentKind = 'initial' | 'renewal' | 'boost'

type CheckoutReservation = {
  paymentId: string
  providerReceipt: string
  providerOrderId: string | null
  amount: number
  currency: string
  plan: PaymentPlan
  paymentKind: PaymentKind
  provisioningToken: string | null
  provisioning: boolean
  reused: boolean
}

function parseReservation(value: unknown): CheckoutReservation | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const row = value as Record<string, unknown>
  const plan = row.plan
  const paymentKind = row.payment_kind
  if (
    typeof row.payment_id !== 'string' ||
    typeof row.provider_receipt !== 'string' ||
    (row.provider_order_id !== null &&
      typeof row.provider_order_id !== 'string') ||
    typeof row.amount !== 'number' ||
    typeof row.currency !== 'string' ||
    typeof plan !== 'string' ||
    !(ALL_PAYMENT_PLANS as readonly string[]).includes(plan) ||
    (paymentKind !== 'initial' &&
      paymentKind !== 'renewal' &&
      paymentKind !== 'boost') ||
    (row.provisioning_token !== null &&
      typeof row.provisioning_token !== 'string') ||
    typeof row.provisioning !== 'boolean' ||
    typeof row.reused !== 'boolean'
  ) {
    return null
  }
  return {
    paymentId: row.payment_id,
    providerReceipt: row.provider_receipt,
    providerOrderId: row.provider_order_id,
    amount: row.amount,
    currency: row.currency,
    plan: plan as PaymentPlan,
    paymentKind,
    provisioningToken: row.provisioning_token,
    provisioning: row.provisioning,
    reused: row.reused,
  }
}

function providerOrderMatchesReservation(
  order: RazorpayOrder,
  reservation: CheckoutReservation,
  jobId: string,
  recruiterId: string
): boolean {
  return (
    order.receipt === reservation.providerReceipt &&
    order.amount === reservation.amount &&
    order.currency.toUpperCase() === reservation.currency.toUpperCase() &&
    order.notes.payment_id === reservation.paymentId &&
    order.notes.job_id === jobId &&
    order.notes.recruiter_id === recruiterId &&
    order.notes.plan === reservation.plan &&
    order.notes.payment_kind === reservation.paymentKind
  )
}

function rpcErrorCode(error: unknown): string {
  if (!error || typeof error !== 'object') return ''
  const message = (error as { message?: unknown }).message
  return typeof message === 'string' ? message : ''
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' })
    return
  }

  try {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      'unknown'
    await rateLimitOrThrow(`create-order:${ip}`, {
      limit: 10,
      windowSeconds: 60,
    })

    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
    const { user, error: authErr } = await getUserFromBearer(token)
    if (!user || !user.email_confirmed_at) {
      res.status(401).json({ error: authErr ?? 'unauthorized' })
      return
    }
    await rateLimitOrThrow(`create-order-user:${user.id}`, {
      limit: 6,
      windowSeconds: 60,
    })

    const bodyRead = readJsonObjectBody(req)
    if (!bodyRead.ok) {
      res.status(400).json({ error: 'invalid_json' })
      return
    }

    const parsed = parseCreateOrderBody(bodyRead.value)
    if (!parsed.ok) {
      res.status(400).json({ error: 'invalid_body' })
      return
    }

    const okTurnstile = await verifyTurnstileToken(parsed.turnstileToken, {
      expectedAction: 'payment_checkout',
      remoteIp: ip,
    })
    if (!okTurnstile) {
      res.status(400).json({ error: 'turnstile_failed' })
      return
    }

    const supInit = tryGetServiceSupabase()
    if (!supInit.ok) {
      res.status(503).json({
        error: 'server_misconfigured',
        missing:
          supInit.reason === 'missing_url'
            ? 'SUPABASE_URL or VITE_SUPABASE_URL'
            : 'SUPABASE_SERVICE_ROLE_KEY',
        hint: 'Set these in Vercel → Settings → Environment Variables (Production), then redeploy. See docs/vercel-environment.md.',
      })
      return
    }
    const sb = supInit.client
    const { data: recruiter } = await sb
      .from('recruiters')
      .select('id, disabled')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!recruiter || recruiter.disabled) {
      res.status(403).json({ error: 'not_recruiter' })
      return
    }

    const { data: job, error: jobErr } = await sb
      .from('jobs')
      .select(
        'id, recruiter_id, approval_status, payment_status, listing_expires_at, featured'
      )
      .eq('id', parsed.jobId)
      .maybeSingle()

    if (jobErr || !job || job.recruiter_id !== recruiter.id) {
      res.status(404).json({ error: 'job_not_found' })
      return
    }

    const plan = parsed.plan
    const initialPayable =
      job.approval_status === 'pending' && job.payment_status === 'unpaid'

    const isLive =
      job.approval_status === 'approved' &&
      job.payment_status === 'paid' &&
      (!job.listing_expires_at || new Date(job.listing_expires_at) > new Date())

    const boostPayable = isLive && planIsFeatured(plan) && !planIsRenewal(plan)

    const renewPayable = planIsRenewal(plan) && jobListingCanRenew(job)

    const initialPlanOk = !planIsRenewal(plan)

    if (!initialPayable && !boostPayable && !renewPayable) {
      res.status(400).json({ error: 'job_not_payable' })
      return
    }

    if (initialPayable && !initialPlanOk) {
      res.status(400).json({ error: 'invalid_plan_for_initial_checkout' })
      return
    }

    const keyId = process.env.RAZORPAY_KEY_ID?.trim()
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim()
    if (!keyId || !keySecret) {
      res.status(500).json({ error: 'payments_not_configured' })
      return
    }

    const amount = PLAN_AMOUNT_INR_PAISE[parsed.plan]
    if (amount < MIN_AMOUNT_PAISE) {
      res.status(400).json({ error: 'amount_below_minimum' })
      return
    }

    const paymentKind: PaymentKind = renewPayable
      ? 'renewal'
      : boostPayable
        ? 'boost'
        : 'initial'

    const { data: reservationData, error: reservationError } = await sb.rpc(
      'reserve_payment_checkout',
      {
        p_job_id: job.id,
        p_recruiter_id: recruiter.id,
        p_plan: parsed.plan,
        p_payment_kind: paymentKind,
        p_amount: amount,
        p_currency: 'INR',
        p_expected_user_id: user.id,
      }
    )
    if (reservationError) {
      const code = rpcErrorCode(reservationError)
      if (code.includes('checkout_plan_conflict')) {
        res.status(409).json({ error: 'checkout_plan_conflict' })
        return
      }
      if (code.includes('job_not_payable')) {
        res.status(409).json({ error: 'job_not_payable' })
        return
      }
      // eslint-disable-next-line no-console
      console.error(reservationError)
      res.status(503).json({ error: 'checkout_reservation_failed' })
      return
    }
    const reservation = parseReservation(reservationData)
    if (!reservation) {
      res.status(503).json({ error: 'checkout_reservation_invalid' })
      return
    }
    if (
      reservation.amount !== amount ||
      reservation.plan !== parsed.plan ||
      reservation.paymentKind !== paymentKind ||
      reservation.currency.toUpperCase() !== 'INR'
    ) {
      res.status(409).json({ error: 'checkout_snapshot_mismatch' })
      return
    }

    if (reservation.providerOrderId) {
      res.status(200).json({
        orderId: reservation.providerOrderId,
        amount: reservation.amount,
        currency: reservation.currency,
        keyId,
        reused: true,
      })
      return
    }
    if (!reservation.provisioningToken) {
      res.setHeader('Retry-After', '2')
      res.status(409).json({ error: 'checkout_provisioning' })
      return
    }

    let order: RazorpayOrder
    try {
      const recovered = await razorpayFindOrderByReceipt({
        keyId,
        keySecret,
        receipt: reservation.providerReceipt,
      })
      order =
        recovered ??
        (await razorpayCreateOrder({
          keyId,
          keySecret,
          amount: reservation.amount,
          currency: reservation.currency,
          receipt: reservation.providerReceipt,
          notes: {
            payment_id: reservation.paymentId,
            job_id: job.id,
            recruiter_id: recruiter.id,
            plan: reservation.plan,
            payment_kind: reservation.paymentKind,
          },
        }))
    } catch (rzErr) {
      // eslint-disable-next-line no-console
      console.error(rzErr)
      res.status(500).json({ error: 'razorpay_order_failed' })
      return
    }

    if (
      !providerOrderMatchesReservation(order, reservation, job.id, recruiter.id)
    ) {
      // A receipt collision or mutated provider order must never be attached to
      // this checkout. The local reservation remains available for investigation.
      res.status(409).json({ error: 'provider_order_mismatch' })
      return
    }

    const { error: bindError } = await sb.rpc('bind_razorpay_order', {
      p_payment_id: reservation.paymentId,
      p_provisioning_token: reservation.provisioningToken,
      p_order_id: order.id,
    })
    if (bindError) {
      // eslint-disable-next-line no-console
      console.error(bindError)
      res.status(503).json({ error: 'provider_order_bind_failed' })
      return
    }

    res.status(200).json({
      orderId: order.id,
      amount: reservation.amount,
      currency: reservation.currency,
      keyId,
      reused: reservation.reused,
    })
  } catch (e) {
    if (isRateLimitError(e)) {
      res.setHeader('Retry-After', String(e.retryAfterSeconds))
      res.status(e.statusCode).json({ error: e.code })
      return
    }
    // eslint-disable-next-line no-console
    console.error(e)
    res.status(500).json({ error: 'internal_error' })
  }
}
