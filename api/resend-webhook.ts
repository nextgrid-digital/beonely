import type { VercelRequest, VercelResponse } from '@vercel/node'
import { readRawBody } from './_lib/raw-body.js'
import { verifyResendWebhook } from './_lib/resend.js'
import { tryGetServiceSupabase } from './_lib/supabase.js'

export const config = { api: { bodyParser: false } }

type ResendEvent = {
  type?: string
  created_at?: string
  data?: {
    email_id?: string
    to?: string[]
    bounce?: { message?: string; type?: string; subType?: string }
    failed?: { reason?: string }
    suppressed?: { message?: string; type?: string }
  }
}

function singleHeader(
  value: string | string[] | undefined
): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function deliveryUpdate(event: ResendEvent): {
  status: 'sent' | 'bounced' | 'complained' | 'failed' | 'suppressed'
  messageId: string
  error: string | null
  recipientEmail: string | null
  suppressRecipient: boolean
} | null {
  const messageId = event.data?.email_id
  if (!messageId) return null
  const recipientEmail = event.data?.to?.[0]?.trim().toLowerCase() || null
  if (event.type === 'email.sent' || event.type === 'email.delivered') {
    return {
      status: 'sent',
      messageId,
      error: null,
      recipientEmail,
      suppressRecipient: false,
    }
  }
  if (event.type === 'email.bounced') {
    const permanent =
      event.data?.bounce?.type?.trim().toLowerCase() === 'permanent'
    return {
      status: 'bounced',
      messageId,
      error: event.data?.bounce?.message ?? 'email_bounced',
      recipientEmail,
      suppressRecipient: permanent,
    }
  }
  if (event.type === 'email.complained') {
    return {
      status: 'complained',
      messageId,
      error: 'email_complained',
      recipientEmail,
      suppressRecipient: true,
    }
  }
  if (event.type === 'email.failed') {
    return {
      status: 'failed',
      messageId,
      error: event.data?.failed?.reason ?? 'email_failed',
      recipientEmail,
      suppressRecipient: false,
    }
  }
  if (event.type === 'email.suppressed') {
    return {
      status: 'suppressed',
      messageId,
      error: event.data?.suppressed?.message ?? 'email_suppressed',
      recipientEmail,
      suppressRecipient: true,
    }
  }
  return null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim()
  if (!secret) {
    return res.status(503).json({ error: 'webhook_not_configured' })
  }

  const id = singleHeader(req.headers['svix-id'])
  const timestamp = singleHeader(req.headers['svix-timestamp'])
  const signature = singleHeader(req.headers['svix-signature'])
  if (!id || !timestamp || !signature) {
    return res.status(401).json({ error: 'invalid_signature' })
  }

  const rawBody = await readRawBody(req)
  if (rawBody === null) {
    return res.status(400).json({ error: 'invalid_body' })
  }

  let event: ResendEvent
  try {
    event = verifyResendWebhook({
      payload: rawBody,
      id,
      timestamp,
      signature,
      webhookSecret: secret,
    }) as ResendEvent
  } catch {
    return res.status(401).json({ error: 'invalid_signature' })
  }

  const update = deliveryUpdate(event)
  if (!update) {
    return res.status(200).json({ ok: true, ignored: true })
  }

  const sbInit = tryGetServiceSupabase()
  if (!sbInit.ok) {
    return res.status(503).json({ error: sbInit.reason })
  }
  const sb = sbInit.client
  const parsedCreatedAt = event.created_at
    ? new Date(event.created_at)
    : new Date()
  const eventAt = Number.isNaN(parsedCreatedAt.getTime())
    ? new Date().toISOString()
    : parsedCreatedAt.toISOString()
  const { data, error } = await sb.rpc('apply_resend_delivery_event', {
    p_event_id: id,
    p_event_type: event.type ?? 'unknown',
    p_message_id: update.messageId,
    p_status: update.status,
    p_error_message: update.error,
    p_event_at: eventAt,
    p_recipient_email: update.recipientEmail,
    p_suppress_recipient: update.suppressRecipient,
  })

  if (error || !data) {
    return res.status(503).json({ error: 'webhook_update_failed' })
  }
  const result = data as { replayed?: boolean }
  return res.status(200).json({ ok: true, replayed: result.replayed === true })
}
