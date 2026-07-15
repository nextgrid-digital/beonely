import type { SupabaseClient } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  PaymentFulfillmentError,
  sendPaymentFulfillmentEmails,
  verifyProviderAndFulfill,
} from './payment-fulfillment.js'
import { PLAN_AMOUNT_INR_PAISE } from './plan-helpers.js'

const mocks = vi.hoisted(() => ({
  fetchOrder: vi.fn(),
  fetchPayment: vi.fn(),
  sendTransactional: vi.fn(),
  dispatch: vi.fn(),
}))

vi.mock('./razorpay-rest.js', () => ({
  razorpayFetchOrder: mocks.fetchOrder,
  razorpayFetchPayment: mocks.fetchPayment,
}))

vi.mock('./resend.js', () => ({
  sendTransactionalEmail: mocks.sendTransactional,
}))

vi.mock('./dispatch-transactional-email.js', () => ({
  dispatchTransactionalEmail: mocks.dispatch,
}))

const orderId = 'order_123'
const paymentId = 'pay_123'
const jobId = '9b229530-efdd-4f97-a299-977c05b136ca'
const recruiterId = '4cc6e472-cb75-4a80-bff4-65ca8fb693af'
const localPaymentId = '0adbc3e7-15c9-47b5-83f7-aa67de4375ae'
const receipt = 'pay_0adbc3e715c947b583f7aa67de4375ae'
const amount = PLAN_AMOUNT_INR_PAISE.standard_week

function providerResponses() {
  mocks.fetchOrder.mockResolvedValue({
    id: orderId,
    amount,
    amountPaid: amount,
    currency: 'INR',
    status: 'paid',
    receipt,
    notes: {
      payment_id: localPaymentId,
      job_id: jobId,
      recruiter_id: recruiterId,
      plan: 'standard_week',
      payment_kind: 'initial',
    },
  })
  mocks.fetchPayment.mockResolvedValue({
    id: paymentId,
    orderId,
    amount,
    currency: 'INR',
    status: 'captured',
    captured: true,
    amountRefunded: 0,
    createdAt: '2026-07-11T10:00:00.000Z',
  })
}

function serviceClient(rpcData: Record<string, unknown>) {
  const rpc = vi.fn(async () => ({ data: rpcData, error: null }))
  const from = vi.fn((table: string) => ({
    select() {
      return this
    },
    eq() {
      return this
    },
    maybeSingle: vi.fn(async () => {
      if (table === 'payments') {
        return {
          data: {
            id: localPaymentId,
            job_id: jobId,
            recruiter_id: recruiterId,
            amount,
            currency: 'INR',
            plan: 'standard_week',
            payment_kind: 'initial',
            provider_receipt: receipt,
            checkout_version: 2,
          },
          error: null,
        }
      }
      throw new Error(`unexpected_table:${table}`)
    }),
  }))
  return {
    client: { from, rpc } as unknown as SupabaseClient,
    rpc,
  }
}

describe('payment fulfillment', () => {
  beforeEach(() => {
    mocks.fetchOrder.mockReset()
    mocks.fetchPayment.mockReset()
    mocks.sendTransactional.mockReset()
    mocks.dispatch.mockReset()
    mocks.dispatch.mockResolvedValue({ ok: true, skipped: true })
    providerResponses()
  })

  it('verifies provider state and delegates one atomic database transaction', async () => {
    const { client, rpc } = serviceClient({
      ok: true,
      replayed: false,
      payment_record_id: localPaymentId,
      job_id: jobId,
      kind: 'initial',
      featured: false,
      expires_at: null,
      recruiter_email: 'recruiter@example.com',
      company_name: 'Acme',
      job_title: 'Platform Engineer',
      plan: 'standard_week',
      manual_review: false,
      entitlement_applied: true,
      withheld_reason: null,
    })

    const result = await verifyProviderAndFulfill({
      sb: client,
      keyId: 'key-id',
      keySecret: 'key-secret',
      orderId,
      paymentId,
      expectedUserId: 'user-1',
    })

    expect(result).toMatchObject({
      jobId,
      orderId,
      paymentId,
      replayed: false,
      kind: 'initial',
    })
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith(
      'fulfill_razorpay_payment_v2',
      expect.objectContaining({
        p_order_id: orderId,
        p_payment_id: paymentId,
        p_paid_at: '2026-07-11T10:00:00.000Z',
        p_expected_user_id: 'user-1',
      })
    )
  })

  it('returns a recorded capture that is held for manual review', async () => {
    const { client } = serviceClient({
      ok: true,
      replayed: false,
      payment_record_id: localPaymentId,
      job_id: jobId,
      kind: 'initial',
      featured: false,
      expires_at: null,
      recruiter_email: 'recruiter@example.com',
      company_name: 'Acme',
      job_title: 'Platform Engineer',
      plan: 'standard_week',
      manual_review: true,
      entitlement_applied: false,
      withheld_reason: 'recruiter_disabled_at_capture',
    })

    await expect(
      verifyProviderAndFulfill({
        sb: client,
        keyId: 'key-id',
        keySecret: 'key-secret',
        orderId,
        paymentId,
      })
    ).resolves.toMatchObject({
      manualReview: true,
      entitlementApplied: false,
      withheldReason: 'recruiter_disabled_at_capture',
    })
  })

  it('rejects a payment whose provider amount does not match the plan', async () => {
    mocks.fetchPayment.mockResolvedValue({
      id: paymentId,
      orderId,
      amount: amount - 1,
      currency: 'INR',
      status: 'captured',
      captured: true,
      createdAt: '2026-07-11T10:00:00.000Z',
    })
    const { client, rpc } = serviceClient({})

    await expect(
      verifyProviderAndFulfill({
        sb: client,
        keyId: 'key-id',
        keySecret: 'key-secret',
        orderId,
        paymentId,
      })
    ).rejects.toEqual(new PaymentFulfillmentError('payment_mismatch', 400))
    expect(rpc).not.toHaveBeenCalled()
  })

  it('re-enters the idempotent dispatcher on replay so failed mail can retry', async () => {
    const { client } = serviceClient({})

    await sendPaymentFulfillmentEmails(client, {
      paymentRecordId: localPaymentId,
      jobId,
      orderId,
      paymentId,
      kind: 'initial',
      replayed: true,
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

    expect(mocks.sendTransactional).not.toHaveBeenCalled()
    expect(mocks.dispatch).toHaveBeenCalledOnce()
  })

  it('does not email a captured payment held for manual review', async () => {
    const { client } = serviceClient({})

    await sendPaymentFulfillmentEmails(client, {
      paymentRecordId: localPaymentId,
      jobId,
      orderId,
      paymentId,
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
      withheldReason: 'late_capture',
    })

    expect(mocks.sendTransactional).not.toHaveBeenCalled()
    expect(mocks.dispatch).not.toHaveBeenCalled()
  })
})
