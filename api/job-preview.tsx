import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleJobOgImage } from './_handlers/job/og-image.js'
import { handleJobShareHtml } from './_handlers/job/share-html.js'

type JobPreviewMode = 'og' | 'share'

function jobPreviewMode (req: VercelRequest): JobPreviewMode | null {
  const raw = req.query.mode
  const fromQuery = Array.isArray(raw) ? raw[0] : raw
  if (fromQuery === 'og' || fromQuery === 'share') {
    return fromQuery
  }

  const pathname = (req.url ?? '').split('?')[0] ?? ''
  if (pathname.includes('/og/job')) return 'og'
  if (pathname.includes('/share/job')) return 'share'
  return null
}

export default async function handler (req: VercelRequest, res: VercelResponse) {
  const mode = jobPreviewMode(req)
  if (mode === 'og') {
    return handleJobOgImage(req, res)
  }
  if (mode === 'share') {
    return handleJobShareHtml(req, res)
  }
  return res.status(404).send('Not found')
}
