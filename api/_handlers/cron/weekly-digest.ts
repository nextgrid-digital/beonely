import type { SupabaseClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireCronAuthorization } from '../../_lib/cron-auth.js'
import {
  claimEmailDelivery,
  finishEmailDelivery,
} from '../../_lib/email-delivery-claim.js'
import { beonelyMarketingHtml } from '../../_lib/email-marketing-layout.js'
import { sendMarketingEmail } from '../../_lib/resend.js'
import { resolveCampaignAudience } from '../../_lib/resolve-campaign-audience.js'
import { serverSiteOrigin } from '../../_lib/site-origin.js'
import { tryGetServiceSupabase } from '../../_lib/supabase.js'

type DigestJobRow = {
  job_title: string
  job_slug: string
  company_name: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function digestPeriod(date = new Date()): string {
  const monday = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  )
  const day = monday.getUTCDay() || 7
  monday.setUTCDate(monday.getUTCDate() - day + 1)
  return monday.toISOString().slice(0, 10)
}

const DIGEST_BATCH_SIZE = 50
const LOG_PAGE_SIZE = 1_000
const TERMINAL_STATUSES = new Set([
  'sent',
  'delivered',
  'bounced',
  'complained',
  'suppressed',
])

async function terminalDigestRecipients(
  sb: SupabaseClient,
  period: string
): Promise<Set<string>> {
  const terminal = new Set<string>()
  for (let offset = 0; ; offset += LOG_PAGE_SIZE) {
    const { data, error } = await sb
      .from('email_send_log')
      .select('recipient_email, status')
      .eq('trigger_key', 'weekly_digest')
      .filter('metadata->>period', 'eq', period)
      .order('id', { ascending: true })
      .range(offset, offset + LOG_PAGE_SIZE - 1)
    if (error) throw new Error(`digest_log_lookup_failed: ${error.message}`)
    const page = (data ?? []) as Array<{
      recipient_email: string
      status: string
    }>
    for (const row of page) {
      if (TERMINAL_STATUSES.has(row.status)) {
        terminal.add(row.recipient_email.trim().toLowerCase())
      }
    }
    if (page.length < LOG_PAGE_SIZE) return terminal
  }
}

export async function handleWeeklyDigest(
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

  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const { data: jobs, error: jobsError } = await sb
    .from('public_jobs')
    .select('job_title, job_slug, company_name, created_at')
    .gte('created_at', weekAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(15)

  if (jobsError) {
    return res.status(503).json({ error: 'jobs_unavailable' })
  }
  if (!jobs?.length) {
    return res
      .status(200)
      .json({ ok: true, skipped: true, reason: 'no_new_jobs' })
  }

  const origin = serverSiteOrigin()
  const listHtml = (jobs as DigestJobRow[])
    .map(
      (job) =>
        `<p style="margin:0 0 12px;"><a href="${escapeHtml(origin)}/jobs/${encodeURIComponent(job.job_slug)}" style="color:#2563eb;">${escapeHtml(job.job_title)}</a> — ${escapeHtml(job.company_name)}</p>`
    )
    .join('')
  const bodyHtml = `<h2 style="margin:0 0 16px;font-size:18px;">New ServiceNow roles this week</h2>${listHtml}<p style="margin:16px 0 0;"><a href="${escapeHtml(origin)}" style="color:#2563eb;">Browse all jobs</a></p>`

  let recipients
  try {
    recipients = await resolveCampaignAudience(sb, 'candidates')
  } catch {
    return res.status(503).json({ error: 'audience_unavailable' })
  }

  const period = digestPeriod()
  let terminal: Set<string>
  try {
    terminal = await terminalDigestRecipients(sb, period)
  } catch {
    return res.status(503).json({ error: 'digest_state_unavailable' })
  }

  let sent = 0
  let failed = 0
  let skipped = 0
  let processed = 0
  let infrastructureFailure = false

  for (const recipient of recipients) {
    if (processed >= DIGEST_BATCH_SIZE) break
    if (terminal.has(recipient.email)) {
      skipped += 1
      continue
    }

    const token = recipient.unsubscribe_token
    if (!token) {
      skipped += 1
      continue
    }
    const unsubscribeUrl = `${origin}/unsubscribe?token=${encodeURIComponent(token)}`
    const html = beonelyMarketingHtml({
      previewText: `${jobs.length} new roles on Beonely`,
      bodyHtml,
      unsubscribeUrl,
    })

    const subject = `Beonely weekly digest — ${jobs.length} new roles`
    const dedupeKey = `weekly_digest:${period}:${recipient.email}`
    let claim
    try {
      claim = await claimEmailDelivery(sb, {
        triggerKey: 'weekly_digest',
        recipientEmail: recipient.email,
        recipientRole: 'candidate',
        subject,
        dedupeKey,
        metadata: { period },
      })
    } catch {
      infrastructureFailure = true
      break
    }
    if (!claim.claimed) {
      skipped += 1
      continue
    }
    processed += 1

    try {
      const result = await sendMarketingEmail({
        to: recipient.email,
        subject,
        html,
        audienceHint: 'candidate',
        idempotencyKey: `weekly/${claim.logId}`,
      })
      await finishEmailDelivery(sb, {
        logId: claim.logId,
        claimToken: claim.claimToken,
        status: result.skipped ? 'skipped' : 'sent',
        messageId: result.skipped ? null : result.messageId,
        errorMessage: result.skipped ? 'resend_not_configured' : null,
      })
      if (result.skipped) skipped += 1
      else sent += 1
    } catch {
      try {
        await finishEmailDelivery(sb, {
          logId: claim.logId,
          claimToken: claim.claimToken,
          status: 'failed',
          errorMessage: 'send_failed',
        })
      } catch {
        infrastructureFailure = true
        break
      }
      failed += 1
    }
  }

  return res.status(infrastructureFailure ? 503 : 200).json({
    ok: true,
    jobs: jobs.length,
    sent,
    failed,
    skipped,
    processed,
    batch_size: DIGEST_BATCH_SIZE,
    recipients: recipients.length,
    resumable: true,
  })
}
