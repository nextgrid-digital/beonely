import type { VercelRequest, VercelResponse } from '@vercel/node'
import handleApplicationAsset from './_handlers/assets/application-asset.js'
import handlePublicPortfolio from './_handlers/assets/public-portfolio.js'

type AssetRoute = 'application-asset' | 'public-portfolio'

const ROUTES: Record<
  AssetRoute,
  (req: VercelRequest, res: VercelResponse) => Promise<unknown>
> = {
  'application-asset': handleApplicationAsset,
  'public-portfolio': handlePublicPortfolio,
}

function routeFromQuery(req: VercelRequest): AssetRoute | null {
  const raw = req.query.route
  const value = Array.isArray(raw) ? raw[0] : raw
  if (value === 'application-asset' || value === 'public-portfolio') return value
  return null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const route = routeFromQuery(req)
  if (!route) return res.status(404).json({ error: 'not_found' })
  return ROUTES[route](req, res)
}
