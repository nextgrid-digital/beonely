import { apiPost } from '@/lib/api-client'
import { PLAN_LABEL, type PaymentPlan } from '@/lib/payments/plans'

export function loadRazorpayScript (): Promise<void> {
  if ((window as unknown as { Razorpay?: unknown }).Razorpay) {
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('razorpay_load'))
    document.body.appendChild(s)
  })
}

type RazorpayPaymentFailedPayload = {
  error?: { description?: string; reason?: string; code?: string }
}

export async function startRazorpayJobCheckout (opts: {
  jobId: string
  plan: PaymentPlan
  accessToken: string
  onPaid: () => void
  onError: (message: string) => void
  /** Called when the user closes the checkout modal without paying. */
  onDismiss?: () => void
}): Promise<void> {
  try {
    const order = await apiPost<{
      orderId: string
      amount: number
      currency: string
      keyId: string
    }>(
      '/api/create-order',
      { jobId: opts.jobId, plan: opts.plan },
      opts.accessToken
    )

    await loadRazorpayScript()
    const options = {
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      order_id: order.orderId,
      name: 'Beonely',
      description: PLAN_LABEL[opts.plan],
      handler: async (response: {
        razorpay_payment_id: string
        razorpay_order_id: string
        razorpay_signature: string
      }) => {
        try {
          await apiPost('/api/verify-payment', response, opts.accessToken)
          opts.onPaid()
        } catch {
          opts.onError('Verification failed — contact support')
        }
      },
      modal: {
        ondismiss: () => {
          if (opts.onDismiss) opts.onDismiss()
          else opts.onError('Payment cancelled')
        },
      },
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rz = new (window as any).Razorpay(options)
    rz.on(
      'payment.failed',
      (response: RazorpayPaymentFailedPayload) => {
        const msg =
          response?.error?.description ||
          response?.error?.reason ||
          response?.error?.code ||
          'Payment failed'
        opts.onError(msg)
      }
    )
    rz.open()
  } catch (e) {
    opts.onError((e as Error).message || 'Payment start failed')
  }
}
