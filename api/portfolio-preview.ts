import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handlePortfolioShareHtml } from './_handlers/portfolio/share-html.js'

export default async function handler (req: VercelRequest, res: VercelResponse) {
  const pathname = (req.url ?? '').split('?')[0] ?? ''
  const mode =
    req.query.mode === 'share' || pathname.includes('/share/portfolio')
      ? 'share'
      : null

  if (mode === 'share') {
    return handlePortfolioShareHtml(req, res)
  }
  return res.status(404).send('Not found')
}
