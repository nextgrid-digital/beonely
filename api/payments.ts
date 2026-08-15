import type { VercelRequest, VercelResponse } from '@vercel/node'
import handleCreateOrder from './_handlers/payments/create-order.js'
import handleVerifyPayment from './_handlers/payments/verify-payment.js'

type PaymentRoute = 'create-order' | 'verify-payment'

const ROUTES: Record<
  PaymentRoute,
  (req: VercelRequest, res: VercelResponse) => Promise<unknown>
> = {
  'create-order': handleCreateOrder,
  'verify-payment': handleVerifyPayment,
}

function routeFromQuery(req: VercelRequest): PaymentRoute | null {
  const raw = req.query.route
  const value = Array.isArray(raw) ? raw[0] : raw
  if (value === 'create-order' || value === 'verify-payment') return value
  return null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const route = routeFromQuery(req)
  if (!route) return res.status(404).json({ error: 'not_found' })
  return ROUTES[route](req, res)
}
