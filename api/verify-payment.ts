import { z } from 'zod'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'node:crypto'
import {
  PaymentFulfillmentError,
  sendPaymentFulfillmentEmails,
  verifyProviderAndFulfill,
} from './_lib/payment-fulfillment.js'
import { isRateLimitError, rateLimitOrThrow } from './_lib/rate-limit.js'
import { readJsonObjectBody } from './_lib/request-json-body.js'
import { getUserFromBearer, tryGetServiceSupabase } from './_lib/supabase.js'

const bodySchema = z.object({
  razorpay_order_id: z.string().min(1).max(120),
  razorpay_payment_id: z.string().min(1).max(120),
  razorpay_signature: z.string().regex(/^[0-9a-f]{64}$/i),
})

function requestIp(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for']
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded
  return value?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown'
}

function validCheckoutSignature(opts: {
  orderId: string
  paymentId: string
  signature: string
  secret: string
}): boolean {
  const expected = crypto
    .createHmac('sha256', opts.secret)
    .update(`${opts.orderId}|${opts.paymentId}`)
    .digest()
  const provided = Buffer.from(opts.signature, 'hex')
  return (
    provided.length === expected.length &&
    crypto.timingSafeEqual(provided, expected)
  )
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  try {
    await rateLimitOrThrow(`verify-payment:${requestIp(req)}`, {
      limit: 20,
      windowSeconds: 60,
    })

    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
    const { user } = await getUserFromBearer(token)
    if (!user || !user.email_confirmed_at) {
      return res.status(401).json({ error: 'unauthorized' })
    }
    await rateLimitOrThrow(`verify-payment-user:${user.id}`, {
      limit: 12,
      windowSeconds: 60,
    })

    const bodyRead = readJsonObjectBody(req)
    if (!bodyRead.ok) {
      return res.status(400).json({ error: 'invalid_json' })
    }
    const parsed = bodySchema.safeParse(bodyRead.value)
    if (!parsed.success) {
      return res.status(400).json({ error: 'invalid_body' })
    }

    const keyId = process.env.RAZORPAY_KEY_ID?.trim()
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim()
    if (!keyId || !keySecret) {
      return res.status(503).json({ error: 'payments_not_configured' })
    }

    const input = parsed.data
    if (
      !validCheckoutSignature({
        orderId: input.razorpay_order_id,
        paymentId: input.razorpay_payment_id,
        signature: input.razorpay_signature,
        secret: keySecret,
      })
    ) {
      return res.status(400).json({ error: 'invalid_signature' })
    }

    const sbInit = tryGetServiceSupabase()
    if (!sbInit.ok) {
      return res.status(503).json({ error: 'service_unavailable' })
    }
    const result = await verifyProviderAndFulfill({
      sb: sbInit.client,
      keyId,
      keySecret,
      orderId: input.razorpay_order_id,
      paymentId: input.razorpay_payment_id,
      expectedUserId: user.id,
    })

    try {
      await sendPaymentFulfillmentEmails(sbInit.client, result)
    } catch {
      // Fulfillment is already committed and idempotent; email is best-effort.
    }

    return res.status(200).json({
      ok: true,
      jobId: result.jobId,
      featured: result.featured,
      kind: result.kind,
      replayed: result.replayed,
      manualReview: result.manualReview,
      entitlementApplied: result.entitlementApplied,
    })
  } catch (error) {
    if (isRateLimitError(error)) {
      res.setHeader('Retry-After', String(error.retryAfterSeconds))
      return res.status(error.statusCode).json({ error: error.code })
    }
    if (error instanceof PaymentFulfillmentError) {
      return res.status(error.statusCode).json({ error: error.code })
    }
    return res.status(502).json({ error: 'payment_verification_failed' })
  }
}
