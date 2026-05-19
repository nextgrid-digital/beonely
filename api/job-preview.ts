import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleJobShareHtml } from './_handlers/job/share-html.js'

export default async function handler (req: VercelRequest, res: VercelResponse) {
  const pathname = (req.url ?? '').split('?')[0] ?? ''
  const mode =
    req.query.mode === 'share' || pathname.includes('/share/job')
      ? 'share'
      : null

  if (mode === 'share') {
    return handleJobShareHtml(req, res)
  }
  return res.status(404).send('Not found')
}
