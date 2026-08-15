import type { VercelRequest } from '@vercel/node'

export const DEFAULT_MAX_JSON_BODY_BYTES = 256 * 1024

function exceedsDeclaredLength(req: VercelRequest, maxBytes: number): boolean {
  const raw = req.headers?.['content-length']
  const value = Array.isArray(raw) ? raw[0] : raw
  if (!value) return false
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > maxBytes
}

/**
 * Read a bounded JSON body. Vercel may already parse JSON bodies into an
 * object, so both the declared length and the materialized value are checked.
 */
export function readJsonObjectBody(
  req: VercelRequest,
  maxBytes = DEFAULT_MAX_JSON_BODY_BYTES
): { ok: true; value: unknown } | { ok: false } {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) return { ok: false }
  if (exceedsDeclaredLength(req, maxBytes)) return { ok: false }

  try {
    const b = req.body
    if (typeof b === 'string') {
      if (Buffer.byteLength(b) > maxBytes) return { ok: false }
      return { ok: true, value: JSON.parse(b) as unknown }
    }
    if (Buffer.isBuffer(b)) {
      if (b.length > maxBytes) return { ok: false }
      return { ok: true, value: JSON.parse(b.toString('utf8')) as unknown }
    }
    if (b !== undefined && Buffer.byteLength(JSON.stringify(b)) > maxBytes) {
      return { ok: false }
    }
    return { ok: true, value: b }
  } catch {
    return { ok: false }
  }
}
