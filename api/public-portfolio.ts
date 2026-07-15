import type { VercelRequest, VercelResponse } from '@vercel/node'
import { fetchPublicPortfolioBySlug } from './_lib/public-portfolio.js'
import { isValidPortfolioSlug } from './_lib/public-slug.js'
import { isRateLimitError, rateLimitOrThrow } from './_lib/rate-limit.js'
import { requestIp } from './_lib/request-ip.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET')
    return res.status(405).json({ error: 'method_not_allowed' })
  const slug = typeof req.query.slug === 'string' ? req.query.slug.trim() : ''
  if (!isValidPortfolioSlug(slug)) {
    return res.status(400).json({ error: 'invalid_slug' })
  }

  res.setHeader('Cache-Control', 'private, no-store')
  try {
    await rateLimitOrThrow(`public-portfolio:${requestIp(req)}`, {
      limit: 120,
      windowSeconds: 300,
    })
    const portfolio = await fetchPublicPortfolioBySlug(slug)
    if (!portfolio) return res.status(404).json({ error: 'not_found' })
    return res.status(200).json(portfolio)
  } catch (error) {
    if (isRateLimitError(error)) {
      res.setHeader('Retry-After', String(error.retryAfterSeconds))
      return res.status(error.statusCode).json({ error: error.code })
    }
    return res.status(500).json({ error: 'portfolio_unavailable' })
  }
}
