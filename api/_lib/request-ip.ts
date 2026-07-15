import type { VercelRequest } from '@vercel/node'

export function requestIp(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for']
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded
  return raw?.split(',')[0]?.trim().slice(0, 128) || 'unknown'
}
