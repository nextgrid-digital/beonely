import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handle as handleConfirmSubscription } from './_handlers/marketing/confirm-subscription.js'
import { handle as handleHiringRequest } from './_handlers/marketing/hiring-request.js'
import { handle as handleMarketingConsent } from './_handlers/marketing/marketing-consent.js'
import { handle as handleSubscribe } from './_handlers/marketing/subscribe.js'
import { handle as handleUnsubscribe } from './_handlers/marketing/unsubscribe.js'

type MarketingRoute =
  | 'subscribe'
  | 'unsubscribe'
  | 'marketing-consent'
  | 'hiring-request'
  | 'confirm-subscription'

const ROUTES: Record<MarketingRoute, typeof handleSubscribe> = {
  subscribe: handleSubscribe,
  unsubscribe: handleUnsubscribe,
  'marketing-consent': handleMarketingConsent,
  'hiring-request': handleHiringRequest,
  'confirm-subscription': handleConfirmSubscription,
}

function routeFromQuery(req: VercelRequest): MarketingRoute | null {
  const raw = req.query.route
  const value = Array.isArray(raw) ? raw[0] : raw
  if (
    value === 'subscribe' ||
    value === 'unsubscribe' ||
    value === 'marketing-consent' ||
    value === 'hiring-request' ||
    value === 'confirm-subscription'
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
