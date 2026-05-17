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
  if (!campaignId) {
    return res.status(400).json({ error: 'missing_campaign_id' })
  }

  const sbInit = tryGetServiceSupabase()
  if (!sbInit.ok) {
    return res.status(500).json({ error: sbInit.reason })
  }

  const { data: campaign, error: cErr } = await sbInit.client
    .from('email_campaigns')
    .select('*')
    .eq('id', campaignId)
    .single()

  if (cErr || !campaign) {
    return res.status(404).json({ error: 'campaign_not_found' })
  }

  const { data: recipients, error: rErr } = await sbInit.client
    .from('email_campaign_recipients')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })
    .limit(500)

  if (rErr) {
    return res.status(500).json({ error: rErr.message })
  }

  const counts: Record<string, number> = {}
  for (const row of recipients ?? []) {
    const st = row.delivery_status as string
    counts[st] = (counts[st] ?? 0) + 1
  }

  return res.status(200).json({
    campaign,
    recipients: recipients ?? [],
    delivery_counts: counts,
  })
}
