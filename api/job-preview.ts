import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleJobShareHtml } from './_handlers/job/share-html.js'
import { handlePortfolioShareHtml } from './_handlers/portfolio/share-html.js'

export default async function handler (req: VercelRequest, res: VercelResponse) {
  const pathname = (req.url ?? '').split('?')[0] ?? ''
  const isShare =
    req.query.mode === 'share' ||
    pathname.includes('/share/job') ||
    pathname.includes('/share/portfolio')

  if (!isShare) {
    return res.status(404).send('Not found')
  }

  const isPortfolio =
    req.query.type === 'portfolio' || pathname.includes('/share/portfolio')

  if (isPortfolio) {
    return handlePortfolioShareHtml(req, res)
  }
  return handleJobShareHtml(req, res)
}
