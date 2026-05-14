/**
 * Razorpay Orders API over HTTPS (no `razorpay` npm package).
 * Avoids Vercel serverless bundling issues with the official SDK (CommonJS + package.json requires).
 */

const ORDERS_BASE = 'https://api.razorpay.com/v1/orders'

function basicAuthHeader (keyId: string, keySecret: string): string {
  const raw = `${keyId}:${keySecret}`
  const token =
    typeof globalThis.Buffer !== 'undefined'
      ? globalThis.Buffer.from(raw, 'utf8').toString('base64')
      : btoa(raw)
  return `Basic ${token}`
}

export async function razorpayCreateOrder (opts: {
  keyId: string
  keySecret: string
  amount: number
  currency: string
  receipt: string
  notes: Record<string, string>
}): Promise<{ id: string }> {
  const res = await fetch(ORDERS_BASE, {
    method: 'POST',
    headers: {
      Authorization: basicAuthHeader(opts.keyId, opts.keySecret),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: opts.amount,
      currency: opts.currency,
      receipt: opts.receipt,
      notes: opts.notes,
    }),
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`razorpay_orders_create ${res.status}: ${text.slice(0, 400)}`)
  }
  const json = JSON.parse(text) as { id?: string }
  if (!json.id || typeof json.id !== 'string') {
    throw new Error('razorpay_orders_create: missing order id in response')
  }
  return { id: json.id }
}

export async function razorpayFetchOrder (opts: {
  keyId: string
  keySecret: string
  orderId: string
}): Promise<{
  amount: number
  notes?: Record<string, string>
}> {
  const url = `${ORDERS_BASE}/${encodeURIComponent(opts.orderId)}`
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: basicAuthHeader(opts.keyId, opts.keySecret),
    },
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`razorpay_orders_fetch ${res.status}: ${text.slice(0, 400)}`)
  }
  const json = JSON.parse(text) as {
    amount?: number
    notes?: Record<string, string>
  }
  const amount = typeof json.amount === 'number' ? json.amount : Number(json.amount)
  if (!Number.isFinite(amount)) {
    throw new Error('razorpay_orders_fetch: invalid amount')
  }
  return { amount, notes: json.notes }
}
