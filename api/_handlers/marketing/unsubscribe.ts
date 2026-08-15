import { z } from 'zod'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { unsubscribeByToken } from '../../_lib/marketing-consent.js'
import { readJsonObjectBody } from '../../_lib/request-json-body.js'
import { tryGetServiceSupabase } from '../../_lib/supabase.js'

const unsubscribeTokenSchema = z.string().uuid()

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export async function handle(req: VercelRequest, res: VercelResponse) {
  const bodyRead = readJsonObjectBody(req, 8 * 1024)
  const body = bodyRead.ok ? bodyRead.value : undefined
  const rawToken =
    typeof req.query.token === 'string'
      ? req.query.token
      : typeof body === 'object' &&
          body !== null &&
          'token' in body &&
          typeof (body as { token: unknown }).token === 'string'
        ? (body as { token: string }).token
        : ''
  const parsedToken = unsubscribeTokenSchema.safeParse(rawToken)
  const token = parsedToken.success ? parsedToken.data : ''

  if (req.method === 'GET') {
    if (!token) {
      return res.status(400).send('Missing unsubscribe token.')
    }
    const safeToken = escapeHtml(token)
    return res
      .status(200)
      .setHeader('Content-Type', 'text/html; charset=utf-8')
      .setHeader('Cache-Control', 'private, no-store')
      .send(
        `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Confirm unsubscribe</title></head><body style="font-family:system-ui,sans-serif;padding:2rem;max-width:32rem;margin:auto;"><h1>Unsubscribe from marketing?</h1><p>Confirm below to stop Beonely marketing emails. Account and application messages may still be sent.</p><form method="post" action="/api/unsubscribe?token=${safeToken}"><button type="submit">Confirm unsubscribe</button></form><p><a href="/">Keep my subscription</a></p></body></html>`
      )
  }

  if (req.method === 'POST') {
    if (!token) {
      return res.status(400).json({ error: 'missing_token' })
    }
    const sbInit = tryGetServiceSupabase()
    if (!sbInit.ok) {
      return res.status(500).json({ error: sbInit.reason })
    }
    const result = await unsubscribeByToken(sbInit.client, token)
    if (!result.ok) {
      return res.status(404).json({ error: 'invalid_token' })
    }
    if (String(req.headers.accept ?? '').includes('text/html')) {
      return res
        .status(200)
        .setHeader('Content-Type', 'text/html; charset=utf-8')
        .setHeader('Cache-Control', 'private, no-store')
        .send(
          `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Unsubscribed</title></head><body style="font-family:system-ui,sans-serif;padding:2rem;max-width:32rem;margin:auto;"><h1>You are unsubscribed</h1><p>${result.email ? `We removed <strong>${escapeHtml(result.email)}</strong> from Beonely marketing emails.` : 'You will no longer receive Beonely marketing emails.'}</p><p><a href="/">Return to Beonely</a></p></body></html>`
        )
    }
    return res.status(200).json({ ok: true, email: result.email })
  }

  return res.status(405).json({ error: 'method_not_allowed' })
}
