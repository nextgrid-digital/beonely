import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handle as handleSubscribe } from './_handlers/marketing/subscribe.js'
import { handle as handleUnsubscribe } from './_handlers/marketing/unsubscribe.js'
import { handle as handleMarketingConsent } from './_handlers/marketing/marketing-consent.js'

type MarketingRoute = 'subscribe' | 'unsubscribe' | 'marketing-consent'

const ROUTES: Record<MarketingRoute, typeof handleSubscribe> = {
  subscribe: handleSubscribe,
  unsubscribe: handleUnsubscribe,
  'marketing-consent': handleMarketingConsent,
}

function routeFromQuery(req: VercelRequest): MarketingRoute | null {
  const raw = req.query.route
  const value = Array.isArray(raw) ? raw[0] : raw
  if (
    value === 'subscribe' ||
    value === 'unsubscribe' ||
    value === 'marketing-consent'
  ) {
    return value
  }
  return null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const route = routeFromQuery(req)
  if (!route) {
    return res.status(404).json({ error: 'not_found' })
  }
  await ROUTES[route](req, res)
}
