import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireCronAuthorization } from '../../_lib/cron-auth.js'
import { dispatchTransactionalEmail } from '../../_lib/dispatch-transactional-email.js'
import { tryGetServiceSupabase } from '../../_lib/supabase.js'

const REMINDER_DAYS = [7, 3, 1] as const

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  )
}

function daysBetweenUtc(from: Date, to: Date): number {
  const a = startOfUtcDay(from).getTime()
  const b = startOfUtcDay(to).getTime()
  return Math.round((b - a) / (24 * 60 * 60 * 1000))
}

export async function handleListingExpiryReminders(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }
  if (!requireCronAuthorization(req, res)) return

  const sbInit = tryGetServiceSupabase()
  if (!sbInit.ok) {
    return res.status(503).json({ error: sbInit.reason })
  }
  const sb = sbInit.client
  const now = new Date()

  const { data: jobs, error: jobsError } = await sb
    .from('jobs')
    .select('id, job_title, company_name, listing_expires_at, recruiter_id')
    .eq('approval_status', 'approved')
    .eq('payment_status', 'paid')
    .not('listing_expires_at', 'is', null)
    .gt('listing_expires_at', now.toISOString())

  if (jobsError) {
    return res.status(503).json({ error: 'jobs_unavailable' })
  }

  let sent = 0
  let skipped = 0
  let failed = 0
  for (const job of jobs ?? []) {
    const expiresAt = new Date(job.listing_expires_at as string)
    const daysLeft = daysBetweenUtc(now, expiresAt)
    if (!REMINDER_DAYS.includes(daysLeft as (typeof REMINDER_DAYS)[number])) {
      continue
    }

    const { data: recruiter, error: recruiterError } = await sb
      .from('recruiters')
      .select('email, disabled')
      .eq('id', job.recruiter_id)
      .maybeSingle()
    const email = recruiter?.email?.trim()
    if (recruiterError || !recruiter || !email || recruiter.disabled) {
      skipped += 1
      continue
    }

    const dedupeKey = `listing_expiry:${job.id}:${daysLeft}d`
    const result = await dispatchTransactionalEmail(sb, {
      trigger_key: 'listing_expiry_reminder',
      to: email,
      recipient_role: 'recruiter',
      payload: {
        job_title: job.job_title,
        company_name: job.company_name,
        days_remaining: daysLeft,
      },
      dedupe_key: dedupeKey,
      metadata: {
        job_id: job.id,
        days_left: daysLeft,
      },
    })

    if (!result.ok) failed += 1
    else if (result.skipped || result.resend_skipped) skipped += 1
    else sent += 1
  }

  return res.status(failed > 0 ? 503 : 200).json({
    ok: failed === 0,
    sent,
    skipped,
    failed,
  })
}
