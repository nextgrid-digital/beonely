import { z } from 'zod'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireStaffAdmin } from '../../_lib/admin-auth.js'
import { tryGetServiceSupabase } from '../../_lib/supabase.js'

export async function handle(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const admin = await requireStaffAdmin(req, res)
  if (!admin) return

  const campaignId =
    typeof req.query.campaign_id === 'string' ? req.query.campaign_id : ''
  const parsedCampaignId = z.string().uuid().safeParse(campaignId)
  if (!parsedCampaignId.success) {
    return res.status(400).json({ error: 'missing_campaign_id' })
  }
  const page = Math.max(1, Number(req.query.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(req.query.page_size) || 50))
  const offset = (page - 1) * pageSize

  const sbInit = tryGetServiceSupabase()
  if (!sbInit.ok) {
    return res.status(500).json({ error: sbInit.reason })
  }

  const { data: campaign, error: cErr } = await sbInit.client
    .from('email_campaigns')
    .select('*')
    .eq('id', parsedCampaignId.data)
    .single()

  if (cErr || !campaign) {
    return res.status(404).json({ error: 'campaign_not_found' })
  }

  const {
    data: recipients,
    error: rErr,
    count: total,
  } = await sbInit.client
    .from('email_campaign_recipients')
    .select('*', { count: 'exact' })
    .eq('campaign_id', parsedCampaignId.data)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (rErr) {
    return res.status(500).json({ error: rErr.message })
  }

  const statuses = ['pending', 'sent', 'failed', 'skipped'] as const
  const countResults = await Promise.all(
    statuses.map((status) =>
      sbInit.client
        .from('email_campaign_recipients')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', parsedCampaignId.data)
        .eq('delivery_status', status)
    )
  )
  const countError = countResults.find((result) => result.error)?.error
  if (countError) return res.status(500).json({ error: countError.message })
  const counts = Object.fromEntries(
    statuses.map((status, index) => [status, countResults[index]?.count ?? 0])
  )

  return res.status(200).json({
    campaign,
    recipients: recipients ?? [],
    delivery_counts: counts,
    pagination: { page, page_size: pageSize, total: total ?? 0 },
  })
}
