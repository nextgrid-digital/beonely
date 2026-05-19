import type { VercelRequest, VercelResponse } from '@vercel/node'
import { tryGetServiceSupabase } from '../../_lib/supabase.js'
import { beonelyMarketingHtml } from '../../_lib/email-marketing-layout.js'
import { sendMarketingEmail } from '../../_lib/resend.js'
import { resolveCampaignAudience } from '../../_lib/resolve-campaign-audience.js'

type DigestJobRow = {
  job_title: string
  job_slug: string
  company_name: string
}

function siteOrigin (): string {
  const raw = process.env.VITE_PUBLIC_SITE_URL?.trim()
  if (raw) return raw.replace(/\/$/, '')
  return 'https://beonely.vercel.app'
}

export async function handleWeeklyDigest (
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

  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const { data: jobs } = await sb
    .from('jobs')
    .select('job_title, job_slug, company_name, created_at')
    .eq('approval_status', 'approved')
    .gte('created_at', weekAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(15)

  if (!jobs?.length) {
    return res.status(200).json({ ok: true, skipped: true, reason: 'no_new_jobs' })
  }

  const origin = siteOrigin()
  const listHtml = (jobs as DigestJobRow[])
    .map(
      (j) =>
        `<p style="margin:0 0 12px;"><a href="${origin}/jobs/${j.job_slug}" style="color:#2563eb;">${j.job_title}</a> — ${j.company_name}</p>`
    )
    .join('')

  const bodyHtml = `<h2 style="margin:0 0 16px;font-size:18px;">New ServiceNow roles this week</h2>${listHtml}<p style="margin:16px 0 0;"><a href="${origin}" style="color:#2563eb;">Browse all jobs</a></p>`

  const recipients = await resolveCampaignAudience(sb, 'candidates')
  let sent = 0
  let failed = 0

  for (const r of recipients.slice(0, 2000)) {
    const { data: sub } = await sb
      .from('email_subscribers')
      .select('unsubscribe_token')
      .eq('email', r.email)
      .maybeSingle()
    const token = sub?.unsubscribe_token ?? ''
    const unsubscribeUrl = token
      ? `${origin}/unsubscribe?token=${encodeURIComponent(token)}`
      : `${origin}/unsubscribe`

    const html = beonelyMarketingHtml({
      previewText: `${jobs.length} new roles on Beonely`,
      bodyHtml,
      unsubscribeUrl,
    })

    try {
      const result = await sendMarketingEmail({
        to: r.email,
        subject: `Beonely weekly digest — ${jobs.length} new roles`,
        html,
        audienceHint: 'candidate',
      })
      if (result.skipped) failed += 1
      else sent += 1
    } catch {
      failed += 1
    }
  }

  return res.status(200).json({
    ok: true,
    jobs: jobs.length,
    sent,
    failed,
    recipients: recipients.length,
  })
}
