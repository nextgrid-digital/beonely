import type { VercelRequest, VercelResponse } from '@vercel/node'
import { tryGetServiceSupabase } from './_lib/supabase.js'

type ResendEvent = {
  type?: string
  data?: {
    email_id?: string
    to?: string[]
    bounce?: { message?: string }
  }
}

function mapEventType(type: string | undefined): string | null {
  if (type === 'email.sent') return 'sent'
  if (type === 'email.bounced') return 'bounced'
  if (type === 'email.complained') return 'complained'
  if (type === 'email.delivery_delayed') return null
  return null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim()
  if (secret) {
    const provided =
      req.headers['resend-signature'] ?? req.headers['x-resend-signature']
    if (provided !== secret) {
      return res.status(401).json({ error: 'invalid_signature' })
    }
  }

  const sbInit = tryGetServiceSupabase()
  if (!sbInit.ok) {
    return res.status(500).json({ error: sbInit.reason })
  }
  const sb = sbInit.client

  const events = Array.isArray(req.body) ? req.body : [req.body]
  for (const raw of events as ResendEvent[]) {
    const status = mapEventType(raw?.type)
    const messageId = raw?.data?.email_id
    if (!status || !messageId) continue

    const errMsg =
      status === 'bounced' || status === 'complained'
        ? (raw.data?.bounce?.message ?? raw.type ?? 'delivery_failed')
        : null

    await sb
      .from('email_campaign_recipients')
      .update({
        delivery_status: status === 'sent' ? 'sent' : 'failed',
        error_message: errMsg,
        ...(status === 'sent'
          ? { sent_at: new Date().toISOString() }
          : {}),
      })
      .eq('resend_message_id', messageId)

    await sb
      .from('email_send_log')
      .update({
        status,
        error_message: errMsg,
      })
      .eq('resend_message_id', messageId)
  }

  return res.status(200).json({ ok: true })
}
