import type { VercelRequest, VercelResponse } from '@vercel/node'
import Razorpay from 'razorpay'
import { z } from 'zod'
import { PLAN_AMOUNT_INR_PAISE } from '@/lib/payments/plans'
import { readJsonObjectBody } from './_lib/request-json-body'
import { rateLimitOrThrow } from './_lib/rate-limit'
import { planIsFeatured } from './_lib/plan-helpers'
import { getUserFromBearer, tryGetServiceSupabase } from './_lib/supabase'
import { verifyTurnstileToken } from './_lib/turnstile'

const bodySchema = z.object({
  jobId: z.string().uuid(),
  plan: z.enum([
    'standard_week',
    'standard_month',
    'featured_week',
    'featured_month',
  ]),
  turnstileToken: z.string().optional(),
})

/** Razorpay minimum order amount (paise). */
const MIN_AMOUNT_PAISE = 100

export default async function handler (req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
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
      return res.status(401).json({ error: authErr ?? 'unauthorized' })
    }

    const bodyRead = readJsonObjectBody(req)
    if (!bodyRead.ok) {
      return res.status(400).json({ error: 'invalid_json' })
    }

    const parsed = bodySchema.safeParse(bodyRead.value)
    if (!parsed.success) {
      return res.status(400).json({ error: 'invalid_body' })
    }

    const okTurnstile = await verifyTurnstileToken(parsed.data.turnstileToken)
    if (!okTurnstile) {
      return res.status(400).json({ error: 'turnstile_failed' })
    }

    const supInit = tryGetServiceSupabase()
    if (!supInit.ok) {
      return res.status(503).json({
        error: 'server_misconfigured',
        missing:
          supInit.reason === 'missing_url'
            ? 'SUPABASE_URL or VITE_SUPABASE_URL'
            : 'SUPABASE_SERVICE_ROLE_KEY',
        hint: 'Set these in Vercel → Settings → Environment Variables (Production), then redeploy. See docs/vercel-environment.md.',
      })
    }
    const sb = supInit.client
    const { data: recruiter } = await sb
      .from('recruiters')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!recruiter) {
      return res.status(403).json({ error: 'not_recruiter' })
    }

    const { data: job, error: jobErr } = await sb
      .from('jobs')
      .select(
        'id, recruiter_id, approval_status, payment_status, listing_expires_at, featured'
      )
      .eq('id', parsed.data.jobId)
      .maybeSingle()

    if (jobErr || !job || job.recruiter_id !== recruiter.id) {
      return res.status(404).json({ error: 'job_not_found' })
    }

    const plan = parsed.data.plan
    const initialPayable =
      job.approval_status === 'pending' && job.payment_status === 'unpaid'

    const isLive =
      job.approval_status === 'approved' &&
      job.payment_status === 'paid' &&
      (!job.listing_expires_at ||
        new Date(job.listing_expires_at) > new Date())

    const boostPayable = isLive && planIsFeatured(plan)

    if (!initialPayable && !boostPayable) {
      return res.status(400).json({ error: 'job_not_payable' })
    }

    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET
    if (!keyId || !keySecret) {
      return res.status(500).json({ error: 'payments_not_configured' })
    }

    const amount = PLAN_AMOUNT_INR_PAISE[parsed.data.plan]
    if (amount < MIN_AMOUNT_PAISE) {
      return res.status(400).json({ error: 'amount_below_minimum' })
    }

    const rz = new Razorpay({ key_id: keyId, key_secret: keySecret })
    let order: { id: string }
    try {
      order = await rz.orders.create({
        amount,
        currency: 'INR',
        receipt: `job_${job.id}`.slice(0, 40),
        notes: {
          job_id: job.id,
          recruiter_id: recruiter.id,
          plan: parsed.data.plan,
        },
      })
    } catch (rzErr) {
      // eslint-disable-next-line no-console
      console.error(rzErr)
      return res.status(500).json({ error: 'razorpay_order_failed' })
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
      return res.status(500).json({ error: 'db_error' })
    }

    return res.status(200).json({
      orderId: order.id,
      amount,
      currency: 'INR',
      keyId: process.env.VITE_RAZORPAY_KEY_ID ?? keyId,
    })
  } catch (e) {
    const status = (e as { statusCode?: number })?.statusCode
    if (status === 429) {
      return res.status(429).json({ error: 'rate_limited' })
    }
    // eslint-disable-next-line no-console
    console.error(e)
    return res.status(500).json({ error: 'internal_error' })
  }
}
