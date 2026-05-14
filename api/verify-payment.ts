import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'crypto'
import { z } from 'zod'
import {
  PLAN_AMOUNT_INR_PAISE,
  planDurationDays,
  planIsFeatured,
  planToJobListingFields,
  type PaymentPlan,
} from './_lib/plan-helpers.js'
import { razorpayFetchOrder } from './_lib/razorpay-rest.js'
import { readJsonObjectBody } from './_lib/request-json-body.js'
import { rateLimitOrThrow } from './_lib/rate-limit.js'
import { getUserFromBearer, tryGetServiceSupabase } from './_lib/supabase.js'
import { beonelyTransactionalHtml } from './_lib/email-layout.js'
import { sendTransactionalEmail } from './_lib/resend.js'

const bodySchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
})

const PLAN_VALUES = [
  'standard_week',
  'standard_month',
  'featured_week',
  'featured_month',
] as const

function parsePlan (raw: unknown): PaymentPlan | null {
  if (typeof raw !== 'string') return null
  return (PLAN_VALUES as readonly string[]).includes(raw)
    ? (raw as PaymentPlan)
    : null
}

export default async function handler (req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  try {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      'unknown'
    await rateLimitOrThrow(`verify-payment:${ip}`)

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

    const secret = process.env.RAZORPAY_KEY_SECRET
    const keyId = process.env.RAZORPAY_KEY_ID
    if (!secret || !keyId) {
      return res.status(500).json({ error: 'payments_not_configured' })
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      parsed.data
    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')

    if (expected !== razorpay_signature) {
      return res.status(400).json({ error: 'invalid_signature' })
    }

    const order = await razorpayFetchOrder({
      keyId,
      keySecret: secret,
      orderId: razorpay_order_id,
    })
    const plan = parsePlan(order.notes?.plan)
    if (!plan) {
      return res.status(400).json({ error: 'invalid_plan' })
    }

    const expectedAmount = PLAN_AMOUNT_INR_PAISE[plan]
    const paidAmount = Number(order.amount)
    if (Number.isNaN(paidAmount) || paidAmount !== expectedAmount) {
      return res.status(400).json({ error: 'amount_mismatch' })
    }

    const listing = planToJobListingFields(plan)

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
    const { data: payment, error: payFindErr } = await sb
      .from('payments')
      .select('id, job_id, recruiter_id, status')
      .eq('razorpay_order_id', razorpay_order_id)
      .maybeSingle()

    if (payFindErr || !payment?.job_id) {
      return res.status(404).json({ error: 'payment_not_found' })
    }

    const { data: recruiter } = await sb
      .from('recruiters')
      .select('id, user_id, company_name')
      .eq('id', payment.recruiter_id)
      .maybeSingle()

    if (!recruiter || recruiter.user_id !== user.id) {
      return res.status(403).json({ error: 'forbidden' })
    }

    const { data: jobSnapshot } = await sb
      .from('jobs')
      .select('approval_status, payment_status, listing_expires_at')
      .eq('id', payment.job_id)
      .maybeSingle()

    await sb
      .from('payments')
      .update({
        status: 'paid',
        razorpay_payment_id,
      })
      .eq('id', payment.id)

    const isBoost =
      jobSnapshot?.approval_status === 'approved' &&
      jobSnapshot?.payment_status === 'paid'

    if (isBoost) {
      if (!jobSnapshot || !planIsFeatured(plan)) {
        return res.status(400).json({ error: 'boost_requires_featured_plan' })
      }
      const days = planDurationDays(plan)
      const base =
        jobSnapshot.listing_expires_at &&
        new Date(jobSnapshot.listing_expires_at) > new Date()
          ? new Date(jobSnapshot.listing_expires_at)
          : new Date()
      base.setUTCDate(base.getUTCDate() + days)
      const iso = base.toISOString()

      await sb
        .from('jobs')
        .update({
          listing_tier: listing.listing_tier,
          listing_duration: listing.listing_duration,
          featured: true,
          featured_expiry: iso,
          listing_expires_at: iso,
        })
        .eq('id', payment.job_id)

      await sendTransactionalEmail({
        to: user.email ?? '',
        subject: 'Beonely — featured boost applied',
        html: beonelyTransactionalHtml({
          headline: 'Featured boost applied',
          bodyParagraphs: [
            `Your live listing is now featured until ${iso.slice(0, 10)} (UTC).`,
            'You can manage your listing from your recruiter dashboard on Beonely.',
          ],
        }),
      })

      return res.status(200).json({
        ok: true,
        jobId: payment.job_id,
        featured: true,
        boost: true,
      })
    }

    await sb
      .from('jobs')
      .update({
        payment_status: 'paid',
        listing_tier: listing.listing_tier,
        listing_duration: listing.listing_duration,
        featured: listing.featured,
        featured_expiry: null,
      })
      .eq('id', payment.job_id)

    await sendTransactionalEmail({
      to: user.email ?? '',
      subject: 'Beonely — payment received',
      html: beonelyTransactionalHtml({
        headline: 'Payment received',
        bodyParagraphs: [
          'Thanks — we received your payment. Your listing is pending approval before it appears on the public job board.',
          'We will email you again when the listing goes live or if we need changes.',
        ],
      }),
    })

    return res.status(200).json({
      ok: true,
      jobId: payment.job_id,
      featured: listing.featured,
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
