import { afterEach, describe, expect, it, vi } from 'vitest'
import { razorpayFetchPayment } from './razorpay-rest.js'

describe('Razorpay REST parsing', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns the provider cumulative refund amount', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            id: 'pay_123',
            order_id: 'order_123',
            amount: 460_200,
            amount_refunded: 75_000,
            currency: 'INR',
            status: 'captured',
            captured: true,
            created_at: 1_783_766_400,
          }),
          { status: 200 }
        )
    )
    vi.stubGlobal('fetch', fetchMock)

    const payment = await razorpayFetchPayment({
      keyId: 'key-id',
      keySecret: 'key-secret',
      paymentId: 'pay_123',
    })

    expect(payment.amountRefunded).toBe(75_000)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.razorpay.com/v1/payments/pay_123',
      expect.objectContaining({ method: 'GET' })
    )
  })
})
