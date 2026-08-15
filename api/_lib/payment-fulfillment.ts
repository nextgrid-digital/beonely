import type { SupabaseClient } from '@supabase/supabase-js'
import { dispatchTransactionalEmail } from './dispatch-transactional-email.js'
import { type PaymentPlan, ALL_PAYMENT_PLANS } from './plan-helpers.js'
import { razorpayFetchOrder, razorpayFetchPayment } from './razorpay-rest.js'

type PaymentKind = 'initial' | 'renewal' | 'boost'

export type PaymentFulfillmentResult = {
  paymentRecordId: string
  jobId: string
  orderId: string
  paymentId: string
  kind: PaymentKind
  replayed: boolean
  featured: boolean
  expiresAt: string | null
  recruiterEmail: string
  companyName: string
  jobTitle: string
  plan: PaymentPlan
  manualReview: boolean
  entitlementApplied: boolean
  withheldReason: string | null
}

export class PaymentFulfillmentError extends Error {
  constructor(
    readonly code: string,
    readonly statusCode: number
  ) {
    super(code)
    this.name = 'PaymentFulfillmentError'
  }
}

function parsePlan(value: unknown): PaymentPlan | null {
  return typeof value === 'string' &&
    (ALL_PAYMENT_PLANS as readonly string[]).includes(value)
    ? (value as PaymentPlan)
    : null
}

function asResult(
  value: unknown,
  context: { orderId: string; paymentId: string }
): PaymentFulfillmentResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new PaymentFulfillmentError('payment_fulfillment_failed', 503)
  }
  const row = value as Record<string, unknown>
  const kind = row.kind
  const plan = parsePlan(row.plan)
  if (
    typeof row.payment_record_id !== 'string' ||
    typeof row.job_id !== 'string' ||
    (kind !== 'initial' && kind !== 'renewal' && kind !== 'boost') ||
    typeof row.replayed !== 'boolean' ||
    typeof row.featured !== 'boolean' ||
    typeof row.recruiter_email !== 'string' ||
    typeof row.company_name !== 'string' ||
    typeof row.job_title !== 'string' ||
    !plan ||
    typeof row.manual_review !== 'boolean' ||
    typeof row.entitlement_applied !== 'boolean'
  ) {
    throw new PaymentFulfillmentError('payment_fulfillment_failed', 503)
  }
  return {
    paymentRecordId: row.payment_record_id,
    jobId: row.job_id,
    orderId: context.orderId,
    paymentId: context.paymentId,
    kind,
    replayed: row.replayed,
    featured: row.featured,
    expiresAt: typeof row.expires_at === 'string' ? row.expires_at : null,
    recruiterEmail: row.recruiter_email,
    companyName: row.company_name,
    jobTitle: row.job_title,
    plan,
    manualReview: row.manual_review,
    entitlementApplied: row.entitlement_applied,
    withheldReason:
      typeof row.withheld_reason === 'string' ? row.withheld_reason : null,
  }
}

export async function verifyProviderAndFulfill(opts: {
  sb: SupabaseClient
  keyId: string
  keySecret: string
  orderId: string
  paymentId: string
  expectedUserId?: string
}): Promise<PaymentFulfillmentResult> {
  const { data: paymentRow, error: paymentError } = await opts.sb
    .from('payments')
    .select(
      'id, job_id, recruiter_id, amount, currency, plan, payment_kind, provider_receipt, checkout_version'
    )
    .eq('razorpay_order_id', opts.orderId)
    .maybeSingle()
  if (paymentError || !paymentRow) {
    throw new PaymentFulfillmentError('payment_not_found', 404)
  }
  const plan = parsePlan(paymentRow.plan)
  if (!plan) throw new PaymentFulfillmentError('invalid_plan', 400)
  const expectedAmount = paymentRow.amount

  const [order, payment] = await Promise.all([
    razorpayFetchOrder({
      keyId: opts.keyId,
      keySecret: opts.keySecret,
      orderId: opts.orderId,
    }),
    razorpayFetchPayment({
      keyId: opts.keyId,
      keySecret: opts.keySecret,
      paymentId: opts.paymentId,
    }),
  ])

  if (
    order.id !== opts.orderId ||
    payment.id !== opts.paymentId ||
    payment.orderId !== opts.orderId ||
    order.amount !== expectedAmount ||
    order.amountPaid !== expectedAmount ||
    payment.amount !== expectedAmount ||
    order.currency.toUpperCase() !== 'INR' ||
    payment.currency.toUpperCase() !== paymentRow.currency.toUpperCase() ||
    order.currency.toUpperCase() !== paymentRow.currency.toUpperCase()
  ) {
    throw new PaymentFulfillmentError('payment_mismatch', 400)
  }
  if (
    order.status !== 'paid' ||
    payment.status !== 'captured' ||
    !payment.captured
  ) {
    throw new PaymentFulfillmentError('payment_not_captured', 409)
  }

  if (
    (paymentRow.checkout_version >= 2 &&
      order.receipt !== paymentRow.provider_receipt) ||
    order.notes.job_id !== paymentRow.job_id ||
    order.notes.recruiter_id !== paymentRow.recruiter_id ||
    order.notes.plan !== plan ||
    (paymentRow.checkout_version >= 2 &&
      (order.notes.payment_id !== paymentRow.id ||
        order.notes.payment_kind !== paymentRow.payment_kind))
  ) {
    throw new PaymentFulfillmentError('payment_mismatch', 400)
  }

  const { data, error } = await opts.sb.rpc('fulfill_razorpay_payment_v2', {
    p_order_id: opts.orderId,
    p_payment_id: opts.paymentId,
    p_paid_at: payment.createdAt,
    p_expected_user_id: opts.expectedUserId ?? null,
  })
  if (error) {
    throw new PaymentFulfillmentError('payment_fulfillment_failed', 409)
  }
  return asResult(data, {
    orderId: opts.orderId,
    paymentId: opts.paymentId,
  })
}

export async function sendPaymentFulfillmentEmails(
  sb: SupabaseClient,
  result: PaymentFulfillmentResult
): Promise<void> {
  if (
    result.manualReview ||
    !result.entitlementApplied ||
    !result.recruiterEmail
  ) {
    return
  }

  if (result.kind === 'renewal' || result.kind === 'boost') {
    const headline =
      result.kind === 'renewal' ? 'Listing extended' : 'Featured boost applied'
    const expiry = result.expiresAt?.slice(0, 10) ?? 'the new expiry date'
    const delivery = await dispatchTransactionalEmail(sb, {
      trigger_key: 'payment_received',
      to: result.recruiterEmail,
      recipient_role: 'recruiter',
      payload: {
        headline,
        subject: `Beonely — ${headline.toLowerCase()}`,
        body_paragraphs: [
          `Your listing is updated through ${expiry} (UTC).`,
          'You can manage it from your Beonely recruiter dashboard.',
        ],
      },
      dedupe_key: `payment_received:${result.paymentRecordId}`,
      metadata: {
        razorpay_order_id: result.orderId,
        razorpay_payment_id: result.paymentId,
      },
    })
    if (!delivery.ok) throw new Error(delivery.error)
    if (delivery.skipped && delivery.reason === 'in_progress') {
      throw new Error('payment_email_in_progress')
    }
    return
  }

  const delivery = await dispatchTransactionalEmail(sb, {
    trigger_key: 'job_submitted',
    to: result.recruiterEmail,
    recipient_role: 'recruiter',
    payload: {
      job_title: result.jobTitle,
      company_name: result.companyName,
    },
    dedupe_key: `job_submitted:${result.jobId}`,
    metadata: {
      razorpay_order_id: result.orderId,
      razorpay_payment_id: result.paymentId,
    },
  })
  if (!delivery.ok) throw new Error(delivery.error)
  if (delivery.skipped && delivery.reason === 'in_progress') {
    throw new Error('payment_email_in_progress')
  }
}
