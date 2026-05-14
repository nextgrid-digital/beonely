import type { VercelRequest, VercelResponse } from '@vercel/node'
import { readJsonObjectBody } from './_lib/request-json-body'
import { rateLimitOrThrow } from './_lib/rate-limit'
import {
  PLAN_AMOUNT_INR_PAISE,
  planIsFeatured,
  type PaymentPlan,
} from './_lib/plan-helpers'
import { razorpayCreateOrder } from './_lib/razorpay-rest'
import { getUserFromBearer, tryGetServiceSupabase } from './_lib/supabase'
import { verifyTurnstileToken } from './_lib/turnstile'

/** UUID shape (matches typical `z.string().uuid()` acceptance). */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const PLANS: readonly PaymentPlan[] = [
  'standard_week',
  'standard_month',
  'featured_week',
  'featured_month',
]

function parseCreateOrderBody (value: unknown):
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
  if (typeof plan !== 'string' || !(PLANS as readonly string[]).includes(plan)) {
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

export default async function handler (
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
    await rateLimitOrThrow(`create-order:${ip}`)

    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
    const { user, error: authErr } = await getUserFromBearer(token)
    if (!user) {
      res.status(401).json({ error: authErr ?? 'unauthorized' })
      return
    }

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

    const okTurnstile = await verifyTurnstileToken(parsed.turnstileToken)
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
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!recruiter) {
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
      (!job.listing_expires_at ||
        new Date(job.listing_expires_at) > new Date())

    const boostPayable = isLive && planIsFeatured(plan)

    if (!initialPayable && !boostPayable) {
      res.status(400).json({ error: 'job_not_payable' })
      return
    }

    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET
    if (!keyId || !keySecret) {
      res.status(500).json({ error: 'payments_not_configured' })
      return
    }

    const amount = PLAN_AMOUNT_INR_PAISE[parsed.plan]
    if (amount < MIN_AMOUNT_PAISE) {
      res.status(400).json({ error: 'amount_below_minimum' })
      return
    }

    let order: { id: string }
    try {
      order = await razorpayCreateOrder({
        keyId,
        keySecret,
        amount,
        currency: 'INR',
        receipt: `job_${job.id}`.slice(0, 40),
        notes: {
          job_id: job.id,
          recruiter_id: recruiter.id,
          plan: parsed.plan,
        },
      })
    } catch (rzErr) {
      // eslint-disable-next-line no-console
      console.error(rzErr)
      res.status(500).json({ error: 'razorpay_order_failed' })
      return
    }

    const { error: payErr } = await sb.from('payments').insert({
      recruiter_id: recruiter.id,
      job_id: job.id,
      amount,
      currency: 'INR',
      status: 'unpaid',
      razorpay_order_id: order.id,
    })

    if (payErr) {
      // eslint-disable-next-line no-console
      console.error(payErr)
      res.status(500).json({ error: 'db_error' })
      return
    }

    res.status(200).json({
      orderId: order.id,
      amount,
      currency: 'INR',
      keyId: process.env.VITE_RAZORPAY_KEY_ID ?? keyId,
    })
  } catch (e) {
    const status = (e as { statusCode?: number })?.statusCode
    if (status === 429) {
      res.status(429).json({ error: 'rate_limited' })
      return
    }
    // eslint-disable-next-line no-console
    console.error(e)
    res.status(500).json({ error: 'internal_error' })
  }
}
