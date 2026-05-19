import type { VercelRequest, VercelResponse } from '@vercel/node'
import { listingExpiryReminderEmail } from '../_lib/email-templates.js'
import { tryGetServiceSupabase } from '../_lib/supabase.js'
import { sendTransactionalEmail } from '../_lib/resend.js'

const REMINDER_DAYS = [7, 3, 1] as const

function siteOrigin (): string {
  const raw = process.env.VITE_PUBLIC_SITE_URL?.trim()
  if (raw) return raw.replace(/\/$/, '')
  return 'https://beonely.vercel.app'
}

function startOfUtcDay (d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  )
}

function daysBetweenUtc (from: Date, to: Date): number {
  const a = startOfUtcDay(from).getTime()
  const b = startOfUtcDay(to).getTime()
  return Math.round((b - a) / (24 * 60 * 60 * 1000))
}

export default async function handler (
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const cronSecret = process.env.CRON_INGEST_SECRET?.trim()
  const auth = req.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (cronSecret && auth !== cronSecret) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const sbInit = tryGetServiceSupabase()
  if (!sbInit.ok) {
    return res.status(500).json({ error: sbInit.reason })
  }
  const sb = sbInit.client
  const now = new Date()
  const portalUrl = `${siteOrigin()}/recruiter`

  const { data: jobs, error: jobsErr } = await sb
    .from('jobs')
    .select('id, job_title, company_name, listing_expires_at, recruiter_id')
    .eq('approval_status', 'approved')
    .eq('payment_status', 'paid')
    .not('listing_expires_at', 'is', null)
    .gt('listing_expires_at', now.toISOString())

  if (jobsErr) {
    // eslint-disable-next-line no-console
    console.error(jobsErr)
    return res.status(500).json({ error: 'db_error' })
  }

  let sent = 0
  let skipped = 0

  for (const job of jobs ?? []) {
    const exp = new Date(job.listing_expires_at as string)
    const daysLeft = daysBetweenUtc(now, exp)
    if (!REMINDER_DAYS.includes(daysLeft as (typeof REMINDER_DAYS)[number])) {
      continue
    }

    const { data: recruiter } = await sb
      .from('recruiters')
      .select('user_id')
      .eq('id', job.recruiter_id)
      .maybeSingle()

    if (!recruiter?.user_id) {
      skipped += 1
      continue
    }

    const { data: profile } = await sb
      .from('profiles')
      .select('email')
      .eq('id', recruiter.user_id)
      .maybeSingle()

    const email = profile?.email?.trim()
    if (!email) {
      skipped += 1
      continue
    }

    const dedupeKey = `listing_expiry:${job.id}:${daysLeft}d`
    const { data: existing } = await sb
      .from('email_send_log')
      .select('id')
      .filter('metadata->>dedupe_key', 'eq', dedupeKey)
      .maybeSingle()

    if (existing) {
      skipped += 1
      continue
    }

    const rendered = listingExpiryReminderEmail({
      jobTitle: String(job.job_title),
      companyName: String(job.company_name),
      daysRemaining: daysLeft,
      recruiterPortalUrl: portalUrl,
    })

    try {
      const result = await sendTransactionalEmail({
        to: email,
        subject: rendered.subject,
        html: rendered.html,
      })

      const messageId =
        result.skipped === false ? result.messageId : null

      await sb.from('email_send_log').insert({
        trigger_key: 'listing_expiry_reminder',
        recipient_email: email,
        recipient_role: 'recruiter',
        subject: rendered.subject,
        resend_message_id: messageId,
        status: result.skipped ? 'skipped' : 'sent',
        metadata: { dedupe_key: dedupeKey, job_id: job.id, days_left: daysLeft },
      })
      if (!result.skipped) sent += 1
      else skipped += 1
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e)
      skipped += 1
    }
  }

  return res.status(200).json({ ok: true, sent, skipped })
}
