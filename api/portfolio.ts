import type { VercelRequest, VercelResponse } from '@vercel/node'
import { fetchPublicPortfolioBySlug } from './_lib/public-portfolio.js'

export default async function handler (req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).end()
  }

  const slug = typeof req.query.slug === 'string' ? req.query.slug.trim() : ''
  if (!slug) {
    return res.status(400).json({ error: 'missing_slug' })
  }

  try {
    const portfolio = await fetchPublicPortfolioBySlug(slug)
    if (!portfolio) {
      return res.status(404).json({ error: 'not_found' })
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300')
    return res.status(200).json(portfolio)
  } catch {
    return res.status(500).json({ error: 'server_error' })
  }
}
