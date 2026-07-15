import { z } from 'zod'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireStaffAdmin } from '../../_lib/admin-auth.js'
import {
  resolveCampaignAudience,
  type CampaignAudience,
} from '../../_lib/resolve-campaign-audience.js'
import { tryGetServiceSupabase } from '../../_lib/supabase.js'

const audienceSchema = z.enum([
  'candidates',
  'recruiters',
  'newsletter',
  'all_marketing',
  'subscribers',
  'both',
])

export async function handle(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const admin = await requireStaffAdmin(req, res)
  if (!admin) return

  const sbInit = tryGetServiceSupabase()
  if (!sbInit.ok) {
    return res.status(500).json({ error: sbInit.reason })
  }
  const sb = sbInit.client

  const rawAudience =
    typeof req.query.audience === 'string' ? req.query.audience : undefined
  const parsedAudience = rawAudience
    ? audienceSchema.safeParse(rawAudience)
    : null
  if (parsedAudience && !parsedAudience.success) {
    return res.status(400).json({ error: 'invalid_audience' })
  }

  try {
    const statuses = ['draft', 'sending', 'sent', 'failed'] as const
    const [
      candidates,
      recruiters,
      newsletter,
      allMarketing,
      subscribersTotal,
      ...statusCounts
    ] = await Promise.all([
      resolveCampaignAudience(sb, 'candidates'),
      resolveCampaignAudience(sb, 'recruiters'),
      resolveCampaignAudience(sb, 'newsletter'),
      resolveCampaignAudience(sb, 'all_marketing'),
      sb
        .from('email_subscribers')
        .select('id', { count: 'exact', head: true })
        .is('unsubscribed_at', null),
      ...statuses.map((status) =>
        sb
          .from('email_campaigns')
          .select('id', { count: 'exact', head: true })
          .eq('status', status)
      ),
    ])

    const queryError =
      subscribersTotal.error ??
      statusCounts.find((result) => result.error)?.error
    if (queryError)
      throw new Error(`campaign_stats_failed: ${queryError.message}`)
    const byStatus = Object.fromEntries(
      statuses.map((status, index) => [status, statusCounts[index]?.count ?? 0])
    )

    const audience = parsedAudience?.success
      ? (parsedAudience.data as CampaignAudience)
      : null

    const knownCounts: Partial<Record<CampaignAudience, number>> = {
      candidates: candidates.length,
      recruiters: recruiters.length,
      newsletter: newsletter.length,
      subscribers: newsletter.length,
      all_marketing: allMarketing.length,
      both: allMarketing.length,
    }

    return res.status(200).json({
      marketing: {
        candidates: candidates.length,
        recruiters: recruiters.length,
        newsletter: newsletter.length,
        all_marketing: allMarketing.length,
        subscribers_active: subscribersTotal.count ?? 0,
      },
      campaigns_by_status: byStatus,
      audience_count: audience ? (knownCounts[audience] ?? null) : null,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'stats_unavailable'
    return res.status(503).json({ error: message })
  }
}
