import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'node:crypto'

function constantTimeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

/** Fail-closed authorization for Vercel cron handlers. */
export function requireCronAuthorization(
  req: VercelRequest,
  res: VercelResponse
): boolean {
  const expected = (
    process.env.CRON_SECRET ?? process.env.CRON_INGEST_SECRET
  )?.trim()
  if (!expected) {
    res.status(503).json({ error: 'cron_not_configured' })
    return false
  }

  const header = req.headers.authorization
  const raw = Array.isArray(header) ? header[0] : header
  const provided = raw?.replace(/^Bearer\s+/i, '').trim() ?? ''
  if (!provided || !constantTimeEqual(provided, expected)) {
    res.status(401).json({ error: 'unauthorized' })
    return false
  }
  return true
}
