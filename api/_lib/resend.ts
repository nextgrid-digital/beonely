import { Resend } from 'resend'

export type SendEmailResult =
  | { skipped: true }
  | { skipped: false; messageId: string | null }

function resendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim()
  if (!key) return null
  return new Resend(key)
}

export function transactionalFromEmail(): string | null {
  return process.env.RESEND_FROM_EMAIL?.trim() || null
}

export function marketingFromEmail(audience?: string): string | null {
  if (audience === 'recruiters' || audience === 'recruiter') {
    return (
      process.env.RESEND_FROM_HIRING?.trim() ||
      process.env.RESEND_FROM_EMAIL?.trim() ||
      null
    )
  }
  if (audience === 'candidates' || audience === 'candidate') {
    return (
      process.env.RESEND_FROM_TALENT?.trim() ||
      process.env.RESEND_FROM_EMAIL?.trim() ||
      null
    )
  }
  return (
    process.env.RESEND_FROM_TALENT?.trim() ||
    process.env.RESEND_FROM_EMAIL?.trim() ||
    null
  )
}

export async function sendTransactionalEmail(opts: {
  to: string
  subject: string
  html: string
  idempotencyKey?: string
}): Promise<SendEmailResult> {
  const from = transactionalFromEmail()
  const resend = resendClient()
  if (!resend || !from) return { skipped: true }
  const { data, error } = await resend.emails.send(
    {
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    },
    opts.idempotencyKey ? { idempotencyKey: opts.idempotencyKey } : undefined
  )
  if (error) throw error
  return { skipped: false, messageId: data?.id ?? null }
}

export async function sendMarketingEmail(opts: {
  to: string
  subject: string
  html: string
  audienceHint?: string
  idempotencyKey?: string
}): Promise<SendEmailResult> {
  const from = marketingFromEmail(opts.audienceHint)
  const resend = resendClient()
  if (!resend || !from) return { skipped: true }
  const { data, error } = await resend.emails.send(
    {
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    },
    opts.idempotencyKey ? { idempotencyKey: opts.idempotencyKey } : undefined
  )
  if (error) throw error
  return { skipped: false, messageId: data?.id ?? null }
}

export function verifyResendWebhook(opts: {
  payload: string
  id: string
  timestamp: string
  signature: string
  webhookSecret: string
}) {
  return new Resend().webhooks.verify({
    payload: opts.payload,
    headers: {
      id: opts.id,
      timestamp: opts.timestamp,
      signature: opts.signature,
    },
    webhookSecret: opts.webhookSecret,
  })
}

export const CAMPAIGN_BATCH_SIZE = 50
