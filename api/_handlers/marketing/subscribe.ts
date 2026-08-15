import { z } from 'zod'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'node:crypto'
import { beonelyTransactionalHtml } from '../../_lib/email-layout.js'
import { isRateLimitError, rateLimitOrThrow } from '../../_lib/rate-limit.js'
import { readJsonObjectBody } from '../../_lib/request-json-body.js'
import { sendTransactionalEmail } from '../../_lib/resend.js'
import { serverSiteOrigin } from '../../_lib/site-origin.js'
import { tryGetServiceSupabase } from '../../_lib/supabase.js'

const bodySchema = z.object({
  email: z.string().email().max(320),
})

export async function handle(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  try {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      'unknown'
    await rateLimitOrThrow(`subscribe:${ip}`, {
      limit: 5,
      windowSeconds: 60,
    })

    const bodyRead = readJsonObjectBody(req)
    if (!bodyRead.ok) {
      return res.status(400).json({ error: 'invalid_json' })
    }
    const parsed = bodySchema.safeParse(bodyRead.value)
    if (!parsed.success) {
      return res.status(400).json({ error: 'invalid_body' })
    }

    const sbInit = tryGetServiceSupabase()
    if (!sbInit.ok) {
      return res.status(500).json({ error: sbInit.reason })
    }
    const sb = sbInit.client
    const email = parsed.data.email.trim().toLowerCase()
    await rateLimitOrThrow(`subscribe-email:${email}`, {
      limit: 2,
      windowSeconds: 3_600,
    })

    const { data: existing, error: lookupError } = await sb
      .from('email_subscribers')
      .select('id, unsubscribed_at, pending_opt_in_requested_at')
      .eq('email', email)
      .maybeSingle()
    if (lookupError) {
      return res.status(503).json({ error: 'subscription_unavailable' })
    }

    // Keep the response generic and avoid repeatedly emailing the same address.
    if (existing?.id && !existing.unsubscribed_at) {
      return res.status(200).json({ ok: true, confirmation_required: true })
    }
    const lastRequested = existing?.pending_opt_in_requested_at
      ? new Date(existing.pending_opt_in_requested_at).getTime()
      : 0
    if (Date.now() - lastRequested < 15 * 60 * 1_000) {
      return res.status(200).json({ ok: true, confirmation_required: true })
    }

    const pendingToken = crypto.randomUUID()
    const now = new Date().toISOString()
    let subscriberId: string
    if (existing?.id) {
      const { data, error } = await sb
        .from('email_subscribers')
        .update({
          pending_opt_in_token: pendingToken,
          pending_opt_in_requested_at: now,
          source: 'footer_pending',
          updated_at: now,
        })
        .eq('id', existing.id)
        .select('id')
        .single()
      if (error || !data) {
        return res.status(503).json({ error: 'subscription_unavailable' })
      }
      subscriberId = data.id as string
    } else {
      const { data, error } = await sb
        .from('email_subscribers')
        .insert({
          email,
          audience: 'newsletter',
          source: 'footer_pending',
          unsubscribed_at: now,
          pending_opt_in_token: pendingToken,
          pending_opt_in_requested_at: now,
        })
        .select('id')
        .single()
      if (error || !data) {
        return res.status(503).json({ error: 'subscription_unavailable' })
      }
      subscriberId = data.id as string
    }

    const confirmationUrl = `${serverSiteOrigin()}/api/confirm-subscription?token=${encodeURIComponent(pendingToken)}`
    try {
      const result = await sendTransactionalEmail({
        to: email,
        subject: 'Confirm your Beonely email updates',
        html: beonelyTransactionalHtml({
          headline: 'Confirm your email updates',
          bodyParagraphs: [
            'Confirm below to subscribe to Beonely newsletter and job updates.',
            'This link expires in 24 hours. If you did not request it, you can ignore this email.',
          ],
          action: { label: 'Confirm subscription', href: confirmationUrl },
        }),
      })
      if (result.skipped) throw new Error('resend_not_configured')
    } catch {
      await sb
        .from('email_subscribers')
        .update({
          pending_opt_in_token: null,
          pending_opt_in_requested_at: null,
        })
        .eq('id', subscriberId)
      return res.status(503).json({ error: 'confirmation_email_unavailable' })
    }

    return res.status(200).json({ ok: true, confirmation_required: true })
  } catch (e) {
    if (isRateLimitError(e)) {
      res.setHeader('Retry-After', String(e.retryAfterSeconds))
      return res.status(e.statusCode).json({ error: e.code })
    }
    const msg = e instanceof Error ? e.message : 'server_error'
    return res.status(500).json({ error: msg })
  }
}
