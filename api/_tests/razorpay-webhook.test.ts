import type { SupabaseClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import handler from '../razorpay-webhook.js'

const mocks = vi.hoisted(() => ({
  verifyAndFulfill: vi.fn(),
  sendEmails: vi.fn(),
  fetchPayment: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock('../_lib/payment-fulfillment.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../_lib/payment-fulfillment.js')>()
  return {
    ...actual,
    verifyProviderAndFulfill: mocks.verifyAndFulfill,
    sendPaymentFulfillmentEmails: mocks.sendEmails,
  }
})

vi.mock('../_lib/razorpay-rest.js', () => ({
  razorpayFetchPayment: mocks.fetchPayment,
}))

vi.mock('../_lib/supabase.js', () => ({
  tryGetServiceSupabase: vi.fn(() => ({
    ok: true,
    client: { rpc: mocks.rpc } as unknown as SupabaseClient,
  })),
}))

const webhookSecret = 'webhook-secret'

function signedRequest(body: Record<string, unknown>, eventId = 'event_1') {
  const rawBody = JSON.stringify(body)
  const signature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex')
  return {
    method: 'POST',
    headers: {
      'x-razorpay-signature': signature,
      'x-razorpay-event-id': eventId,
    },
    body: rawBody,
  } as unknown as VercelRequest
}

function response() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(value: unknown) {
      this.body = value
      return this
    },
    setHeader(name: string, value: string) {
      this.headers[name] = value
      return this
    },
  }
  return res as unknown as VercelResponse & {
    statusCode: number
    body: unknown
  }
}

function captureEvent() {
  return {
    event: 'payment.captured',
    created_at: 1_783_766_400,
    payload: {
      payment: {
        entity: {
          id: 'pay_123',
          order_id: 'order_123',
          amount: 460_200,
        },
      },
    },
  }
}

describe('Razorpay webhook', () => {
  beforeEach(() => {
    process.env.RAZORPAY_WEBHOOK_SECRET = webhookSecret
    process.env.RAZORPAY_KEY_ID = 'key-id'
    process.env.RAZORPAY_KEY_SECRET = 'key-secret'
    mocks.verifyAndFulfill.mockReset()
    mocks.sendEmails.mockReset()
    mocks.fetchPayment.mockReset()
    mocks.rpc.mockReset()
    mocks.rpc.mockImplementation(async (name: string) => {
      if (name === 'claim_razorpay_webhook_event') {
        return {
          data: { claimed: true, replayed: false, in_progress: false },
          error: null,
        }
      }
      return { data: null, error: null }
    })
    mocks.verifyAndFulfill.mockResolvedValue({
      paymentRecordId: '0adbc3e7-15c9-47b5-83f7-aa67de4375ae',
      jobId: '9b229530-efdd-4f97-a299-977c05b136ca',
      orderId: 'order_123',
      paymentId: 'pay_123',
      kind: 'initial',
      replayed: false,
      featured: false,
      expiresAt: null,
      recruiterEmail: 'recruiter@example.com',
      companyName: 'Acme',
      jobTitle: 'Platform Engineer',
      plan: 'standard_week',
      manualReview: false,
      entitlementApplied: true,
      withheldReason: null,
    })
    mocks.sendEmails.mockResolvedValue(undefined)
  })

  it('does not complete a capture event until its idempotent email succeeds', async () => {
    const order: string[] = []
    mocks.sendEmails.mockImplementation(async () => {
      order.push('email')
    })
    mocks.rpc.mockImplementation(async (name: string) => {
      if (name === 'claim_razorpay_webhook_event') {
        return {
          data: { claimed: true, replayed: false, in_progress: false },
          error: null,
        }
      }
      if (name === 'complete_razorpay_webhook_event') order.push('complete')
      return { data: null, error: null }
    })
    const res = response()

    await handler(signedRequest(captureEvent()), res)

    expect(res.statusCode).toBe(200)
    expect(order).toEqual(['email', 'complete'])
  })

  it('completes a captured payment that is held for manual review', async () => {
    mocks.verifyAndFulfill.mockResolvedValue({
      paymentRecordId: '0adbc3e7-15c9-47b5-83f7-aa67de4375ae',
      jobId: '9b229530-efdd-4f97-a299-977c05b136ca',
      orderId: 'order_123',
      paymentId: 'pay_123',
      kind: 'initial',
      replayed: false,
      featured: false,
      expiresAt: null,
      recruiterEmail: 'recruiter@example.com',
      companyName: 'Acme',
      jobTitle: 'Platform Engineer',
      plan: 'standard_week',
      manualReview: true,
      entitlementApplied: false,
      withheldReason: 'recruiter_disabled_at_capture',
    })
    const res = response()

    await handler(signedRequest(captureEvent()), res)

    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({
      ok: true,
      replayed: false,
      manualReview: true,
    })
    expect(mocks.rpc).toHaveBeenCalledWith(
      'complete_razorpay_webhook_event',
      {
        p_event_id: 'event_1',
        p_action: 'capture_recorded_manual_review',
        p_payment_record_id: '0adbc3e7-15c9-47b5-83f7-aa67de4375ae',
      }
    )
  })

  it('fails the event claim when payment email delivery fails so it can retry', async () => {
    mocks.sendEmails.mockRejectedValue(new Error('resend_unavailable'))
    const res = response()

    await handler(signedRequest(captureEvent()), res)

    expect(res.statusCode).toBe(503)
    expect(res.body).toEqual({ error: 'payment_email_failed' })
    expect(mocks.rpc).toHaveBeenCalledWith('fail_razorpay_webhook_event', {
      p_event_id: 'event_1',
      p_error_code: 'payment_email_failed',
    })
    expect(mocks.rpc).not.toHaveBeenCalledWith(
      'complete_razorpay_webhook_event',
      expect.anything()
    )
  })

  it('uses provider-verified cumulative refunds for out-of-order partial events', async () => {
    mocks.fetchPayment.mockResolvedValue({
      id: 'pay_123',
      orderId: 'order_123',
      amount: 460_200,
      amountRefunded: 75_000,
      currency: 'INR',
      status: 'captured',
      captured: true,
      createdAt: '2026-07-11T10:00:00.000Z',
    })
    const res = response()

    await handler(
      signedRequest(
        {
          event: 'refund.processed',
          created_at: 1_783_766_400,
          payload: {
            refund: {
              entity: {
                id: 'rfnd_2',
                payment_id: 'pay_123',
                amount: 25_000,
              },
            },
          },
        },
        'event_refund_2'
      ),
      res
    )

    expect(res.statusCode).toBe(200)
    expect(mocks.rpc).toHaveBeenCalledWith(
      'apply_razorpay_lifecycle_event',
      expect.objectContaining({
        p_event_id: 'event_refund_2',
        p_provider_payment_id: 'pay_123',
        p_amount: 75_000,
      })
    )
  })
})
