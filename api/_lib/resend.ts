import { Resend } from 'resend'

export async function sendTransactionalEmail (opts: {
  to: string
  subject: string
  html: string
}) {
  const key = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  if (!key || !from) return { skipped: true as const }
  const resend = new Resend(key)
  await resend.emails.send({
    from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  })
  return { skipped: false as const }
}
