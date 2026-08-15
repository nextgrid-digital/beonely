import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'node:crypto'
import {
  PaymentFulfillmentError,
  sendPaymentFulfillmentEmails,
  verifyProviderAndFulfill,
} from './_lib/payment-fulfillment.js'
import { readRawBody } from './_lib/raw-body.js'
import { razorpayFetchPayment } from './_lib/razorpay-rest.js'
import { tryGetServiceSupabase } from './_lib/supabase.js'

export const config = { api: { bodyParser: false } }

const entitySchema = z
  .object({
    id: z.string().min(1).max(120),
    order_id: z.string().min(1).max(120).nullish(),
    payment_id: z.string().min(1).max(120).nullish(),
    amount: z.number().int().nonnegative().optional(),
    amount_refunded: z.number().int().nonnegative().optional(),
    error_code: z.string().max(200).nullish(),
    error_description: z.string().max(500).nullish(),
  })
  .passthrough()

const webhookSchema = z.object({
  event: z.string().min(1).max(120),
  created_at: z.number().int().positive().optional(),
  payload: z
    .object({
      payment: z.object({ entity: entitySchema }).optional(),
      refund: z.object({ entity: entitySchema }).optional(),
      dispute: z.object({ entity: entitySchema }).optional(),
    })
    .passthrough(),
})

const CAPTURE_EVENTS = new Set(['payment.captured', 'order.paid'])
const LIFECYCLE_EVENTS = new Set([
  'payment.failed',
  'payment.refunded',
  'refund.created',
  'refund.processed',
  'refund.failed',
  'payment.dispute.created',
  'payment.dispute.won',
  'payment.dispute.lost',
  'payment.dispute.closed',
])

function singleHeader(
  value: string | string[] | undefined
): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function validWebhookSignature(
  body: string,
  providedHex: string,
  secret: string
): boolean {
  if (!/^[0-9a-f]{64}$/i.test(providedHex)) return false
  const expected = crypto.createHmac('sha256', secret).update(body).digest()
  const provided = Buffer.from(providedHex, 'hex')
  return (
    provided.length === expected.length &&
    crypto.timingSafeEqual(provided, expected)
  )
}

function eventId(req: VercelRequest, rawBody: string): string {
  const header = singleHeader(req.headers['x-razorpay-event-id'])?.trim()
  if (header && header.length <= 200) return header
  return `body_${crypto.createHash('sha256').update(rawBody).digest('hex')}`
}

function providerEventAt(createdAt: number | undefined): string {
  if (!createdAt) return new Date().toISOString()
  const value = new Date(createdAt * 1_000)
  return Number.isNaN(value.getTime())
    ? new Date().toISOString()
    : value.toISOString()
}

type ClaimResult = {
  claimed: boolean
  replayed: boolean
  inProgress: boolean
}

function parseClaim(value: unknown): ClaimResult | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const row = value as Record<string, unknown>
  if (
    typeof row.claimed !== 'boolean' ||
    typeof row.replayed !== 'boolean' ||
    typeof row.in_progress !== 'boolean'
  ) {
    return null
  }
  return {
    claimed: row.claimed,
    replayed: row.replayed,
    inProgress: row.in_progress,
  }
}

async function failClaim(
  sb: SupabaseClient,
  id: string,
  code: string
): Promise<void> {
  await sb.rpc('fail_razorpay_webhook_event', {
    p_event_id: id,
    p_error_code: code,
  })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim()
  const keyId = process.env.RAZORPAY_KEY_ID?.trim()
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim()
  if (!webhookSecret || !keyId || !keySecret) {
    return res.status(503).json({ error: 'webhook_not_configured' })
  }

  const rawBody = await readRawBody(req)
  const signature = singleHeader(req.headers['x-razorpay-signature'])
  if (
    rawBody === null ||
    !signature ||
    !validWebhookSignature(rawBody, signature, webhookSecret)
  ) {
    return res.status(401).json({ error: 'invalid_signature' })
  }

  let json: unknown
  try {
    json = JSON.parse(rawBody)
  } catch {
    return res.status(400).json({ error: 'invalid_json' })
  }
  const parsed = webhookSchema.safeParse(json)
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_event' })
  }

  const eventType = parsed.data.event
  if (!CAPTURE_EVENTS.has(eventType) && !LIFECYCLE_EVENTS.has(eventType)) {
    return res.status(200).json({ ok: true, ignored: true })
  }

  const sbInit = tryGetServiceSupabase()
  if (!sbInit.ok) {
    return res.status(503).json({ error: 'service_unavailable' })
  }
  const sb = sbInit.client
  const payment = parsed.data.payload.payment?.entity
  const refund = parsed.data.payload.refund?.entity
  const dispute = parsed.data.payload.dispute?.entity
  const entity = payment ?? refund ?? dispute
  const providerPaymentId =
    payment?.id ?? refund?.payment_id ?? dispute?.payment_id
  const providerOrderId = payment?.order_id
  const id = eventId(req, rawBody)
  const eventAt = providerEventAt(parsed.data.created_at)

  const { data: claimData, error: claimError } = await sb.rpc(
    'claim_razorpay_webhook_event',
    {
      p_event_id: id,
      p_event_type: eventType,
      p_event_at: eventAt,
      p_provider_entity_id: entity?.id ?? null,
      p_provider_payment_id: providerPaymentId ?? null,
      p_provider_order_id: providerOrderId ?? null,
    }
  )
  const claim = parseClaim(claimData)
  if (claimError || !claim) {
    return res.status(503).json({ error: 'event_claim_failed' })
  }
  if (claim.replayed) {
    return res.status(200).json({ ok: true, replayed: true })
  }
  if (!claim.claimed || claim.inProgress) {
    res.setHeader('Retry-After', '3')
    return res.status(503).json({ error: 'event_processing' })
  }

  if (CAPTURE_EVENTS.has(eventType)) {
    if (!payment?.order_id) {
      await failClaim(sb, id, 'payment_missing')
      return res.status(400).json({ error: 'payment_missing' })
    }
    try {
      const result = await verifyProviderAndFulfill({
        sb,
        keyId,
        keySecret,
        orderId: payment.order_id,
        paymentId: payment.id,
      })
      try {
        await sendPaymentFulfillmentEmails(sb, result)
      } catch {
        await failClaim(sb, id, 'payment_email_failed')
        return res.status(503).json({ error: 'payment_email_failed' })
      }
      const { error: completeError } = await sb.rpc(
        'complete_razorpay_webhook_event',
        {
          p_event_id: id,
          p_action: result.entitlementApplied
            ? result.replayed
              ? 'capture_replayed'
              : 'capture_entitlement_applied'
            : 'capture_recorded_manual_review',
          p_payment_record_id: result.paymentRecordId,
        }
      )
      if (completeError) {
        await failClaim(sb, id, 'event_completion_failed')
        return res.status(503).json({ error: 'event_completion_failed' })
      }
      return res.status(200).json({
        ok: true,
        replayed: result.replayed,
        manualReview: result.manualReview,
      })
    } catch (error) {
      const code =
        error instanceof PaymentFulfillmentError
          ? error.code
          : 'payment_verification_failed'
      await failClaim(sb, id, code)
      if (error instanceof PaymentFulfillmentError) {
        return res.status(error.statusCode).json({ error: error.code })
      }
      return res.status(502).json({ error: code })
    }
  }

  let amount = refund?.amount ?? dispute?.amount
  if (eventType === 'payment.refunded' || eventType === 'refund.processed') {
    const eventRefundFloor =
      eventType === 'refund.processed'
        ? refund?.amount
        : payment?.amount_refunded
    if (!providerPaymentId) {
      await failClaim(sb, id, 'refund_payment_missing')
      return res.status(400).json({ error: 'refund_payment_missing' })
    }
    if (
      eventType === 'refund.processed' &&
      (typeof eventRefundFloor !== 'number' || eventRefundFloor <= 0)
    ) {
      await failClaim(sb, id, 'refund_amount_invalid')
      return res.status(400).json({ error: 'refund_amount_invalid' })
    }
    try {
      const providerPayment = await razorpayFetchPayment({
        keyId,
        keySecret,
        paymentId: providerPaymentId,
      })
      if (
        providerPayment.id !== providerPaymentId ||
        (payment?.order_id && providerPayment.orderId !== payment.order_id)
      ) {
        await failClaim(sb, id, 'refund_payment_mismatch')
        return res.status(400).json({ error: 'refund_payment_mismatch' })
      }
      if (
        typeof eventRefundFloor === 'number' &&
        providerPayment.amountRefunded < eventRefundFloor
      ) {
        await failClaim(sb, id, 'refund_provider_state_stale')
        res.setHeader('Retry-After', '3')
        return res.status(503).json({ error: 'refund_provider_state_stale' })
      }
      // Razorpay refund entities expose an individual refund amount. The
      // payment entity exposes the authoritative cumulative amount, which is
      // safe for duplicate and out-of-order webhook delivery.
      amount = providerPayment.amountRefunded
    } catch {
      await failClaim(sb, id, 'refund_verification_failed')
      return res.status(502).json({ error: 'refund_verification_failed' })
    }
  }
  const failureCode =
    entity?.error_code ?? entity?.error_description ?? undefined
  const { data: lifecycleData, error: lifecycleError } = await sb.rpc(
    'apply_razorpay_lifecycle_event',
    {
      p_event_id: id,
      p_event_type: eventType,
      p_provider_payment_id: providerPaymentId ?? null,
      p_provider_order_id: providerOrderId ?? null,
      p_amount: amount ?? null,
      p_failure_code: failureCode ?? null,
      p_event_at: eventAt,
    }
  )
  if (lifecycleError) {
    await failClaim(sb, id, 'lifecycle_event_failed')
    return res.status(503).json({ error: 'lifecycle_event_failed' })
  }
  return res.status(200).json({ ok: true, lifecycle: lifecycleData })
}
