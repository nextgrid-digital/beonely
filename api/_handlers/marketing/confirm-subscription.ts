import { z } from 'zod'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { readJsonObjectBody } from '../../_lib/request-json-body.js'
import { tryGetServiceSupabase } from '../../_lib/supabase.js'

const tokenSchema = z.string().uuid()

function tokenFromRequest(req: VercelRequest): string {
  if (typeof req.query.token === 'string') return req.query.token
  const bodyRead = readJsonObjectBody(req, 8 * 1024)
  if (
    bodyRead.ok &&
    bodyRead.value &&
    typeof bodyRead.value === 'object' &&
    'token' in bodyRead.value &&
    typeof (bodyRead.value as { token?: unknown }).token === 'string'
  ) {
    return (bodyRead.value as { token: string }).token
  }
  return ''
}

function page(content: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Confirm subscription</title></head><body style="font-family:system-ui,sans-serif;padding:2rem;max-width:32rem;margin:auto">${content}</body></html>`
}

export async function handle(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const parsedToken = tokenSchema.safeParse(tokenFromRequest(req))
  if (!parsedToken.success) {
    return res.status(400).send('Missing or invalid confirmation token.')
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Robots-Tag', 'noindex, nofollow')

  if (req.method === 'GET') {
    return res
      .status(200)
      .send(
        page(
          `<h1>Confirm email updates</h1><p>Confirm that you want to receive Beonely newsletter and job updates.</p><form method="post" action="/api/confirm-subscription"><input type="hidden" name="token" value="${parsedToken.data}"/><button type="submit" style="font:inherit;padding:.65rem 1rem;cursor:pointer">Confirm subscription</button></form><p><a href="/">Return to Beonely</a></p>`
        )
      )
  }

  const sbInit = tryGetServiceSupabase()
  if (!sbInit.ok) {
    return res
      .status(503)
      .send(page('<h1>Service unavailable</h1><p>Please try again later.</p>'))
  }
  const sb = sbInit.client
  const { data: subscriber, error: lookupError } = await sb
    .from('email_subscribers')
    .select('id, pending_opt_in_requested_at')
    .eq('pending_opt_in_token', parsedToken.data)
    .maybeSingle()
  if (
    lookupError ||
    !subscriber?.id ||
    !subscriber.pending_opt_in_requested_at
  ) {
    return res
      .status(404)
      .send(
        page(
          '<h1>Link not found</h1><p>This confirmation link is invalid or already used.</p>'
        )
      )
  }

  const requestedAt = new Date(subscriber.pending_opt_in_requested_at).getTime()
  if (
    !Number.isFinite(requestedAt) ||
    Date.now() - requestedAt > 24 * 60 * 60 * 1_000
  ) {
    await sb
      .from('email_subscribers')
      .update({ pending_opt_in_token: null, pending_opt_in_requested_at: null })
      .eq('id', subscriber.id)
    return res
      .status(410)
      .send(
        page(
          '<h1>Link expired</h1><p>Submit the subscription form again for a new link.</p>'
        )
      )
  }

  const { data: confirmed, error } = await sb
    .from('email_subscribers')
    .update({
      audience: 'newsletter',
      source: 'footer_confirmed',
      unsubscribed_at: null,
      pending_opt_in_token: null,
      pending_opt_in_requested_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriber.id)
    .eq('pending_opt_in_token', parsedToken.data)
    .select('id')
    .maybeSingle()
  if (error || !confirmed) {
    return res
      .status(409)
      .send(
        page(
          '<h1>Already handled</h1><p>This confirmation link has already been used.</p>'
        )
      )
  }

  return res
    .status(200)
    .send(
      page(
        '<h1>Subscription confirmed</h1><p>You will now receive Beonely newsletter and job updates. Every marketing email includes an unsubscribe link.</p><p><a href="/">Return to Beonely</a></p>'
      )
    )
}
