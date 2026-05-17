import type { VercelRequest, VercelResponse } from '@vercel/node'
import { tryGetServiceSupabase } from '../../_lib/supabase.js'
import { unsubscribeByToken } from '../../_lib/marketing-consent.js'

export async function handle(req: VercelRequest, res: VercelResponse) {
  const token =
    typeof req.query.token === 'string'
      ? req.query.token
      : typeof req.body === 'object' &&
          req.body !== null &&
          'token' in req.body &&
          typeof (req.body as { token: unknown }).token === 'string'
        ? (req.body as { token: string }).token
        : ''

  if (req.method === 'GET') {
    if (!token) {
      return res.status(400).send('Missing unsubscribe token.')
    }
    const sbInit = tryGetServiceSupabase()
    if (!sbInit.ok) {
      return res.status(500).send('Service unavailable.')
    }
    const result = await unsubscribeByToken(sbInit.client, token)
    if (!result.ok) {
      return res.status(404).send('This unsubscribe link is invalid or expired.')
    }
    return res
      .status(200)
      .setHeader('Content-Type', 'text/html; charset=utf-8')
      .send(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>Unsubscribed</title></head><body style="font-family:system-ui,sans-serif;padding:2rem;max-width:32rem;margin:auto;"><h1>You are unsubscribed</h1><p>${result.email ? `We removed <strong>${result.email}</strong> from Beonely marketing emails.` : 'You will no longer receive Beonely marketing emails.'}</p><p><a href="/">Return to Beonely</a></p></body></html>`)
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
    return res.status(200).json({ ok: true, email: result.email })
  }

  return res.status(405).json({ error: 'method_not_allowed' })
}
