import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireStaffAdmin } from '../../_lib/admin-auth.js'
import { tryGetServiceSupabase } from '../../_lib/supabase.js'
import { resolveCampaignAudience } from '../../_lib/resolve-campaign-audience.js'
import type { CampaignAudience } from '../../_lib/resolve-campaign-audience.js'

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

  const [
    candidates,
    recruiters,
    newsletter,
    allMarketing,
    subscribersTotal,
    campaigns,
  ] = await Promise.all([
    resolveCampaignAudience(sb, 'candidates'),
    resolveCampaignAudience(sb, 'recruiters'),
    resolveCampaignAudience(sb, 'newsletter'),
    resolveCampaignAudience(sb, 'all_marketing'),
    sb
      .from('email_subscribers')
      .select('id', { count: 'exact', head: true })
      .is('unsubscribed_at', null),
    sb.from('email_campaigns').select('status'),
  ])

  const byStatus: Record<string, number> = {}
  for (const row of campaigns.data ?? []) {
    const s = row.status as string
    byStatus[s] = (byStatus[s] ?? 0) + 1
  }

  const audience =
    typeof req.query.audience === 'string'
      ? (req.query.audience as CampaignAudience)
      : null

  let audienceCount: number | null = null
  if (audience) {
    const list = await resolveCampaignAudience(sb, audience)
    audienceCount = list.length
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
    audience_count: audienceCount,
  })
}
