import type { VercelRequest } from '@vercel/node'

/** Read an exact request body for signed webhooks, with a hard size ceiling. */
export async function readRawBody(
  req: VercelRequest,
  maxBytes = 1_000_000
): Promise<string | null> {
  if (typeof req.body === 'string') {
    return Buffer.byteLength(req.body) <= maxBytes ? req.body : null
  }
  if (Buffer.isBuffer(req.body)) {
    return req.body.length <= maxBytes ? req.body.toString('utf8') : null
  }
  if (req.body !== undefined && req.body !== null) return null
  if (!(Symbol.asyncIterator in req)) return null

  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > maxBytes) return null
    chunks.push(buffer)
  }
  return Buffer.concat(chunks).toString('utf8')
}
