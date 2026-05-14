import type { VercelRequest } from '@vercel/node'

/**
 * Read `req.body` as JSON. Vercel may already parse JSON bodies into an object.
 */
export function readJsonObjectBody(
  req: VercelRequest
): { ok: true; value: unknown } | { ok: false } {
  try {
    const b = req.body
    if (typeof b === 'string') {
      return { ok: true, value: JSON.parse(b) as unknown }
    }
    if (Buffer.isBuffer(b)) {
      return { ok: true, value: JSON.parse(b.toString('utf8')) as unknown }
    }
    return { ok: true, value: b }
  } catch {
    return { ok: false }
  }
}
