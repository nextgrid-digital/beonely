import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireStaffAdmin } from '../../_lib/admin-auth.js'
import { tryGetServiceSupabase } from '../../_lib/supabase.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

  const since = new Date()
  since.setDate(since.getDate() - 30)

  const [{ data: logs }, { data: campaigns }, { data: recipients }] =
    await Promise.all([
      sb
        .from('email_send_log')
        .select('trigger_key, status, created_at, campaign_id')
        .gte('created_at', since.toISOString()),
      sb.from('email_campaigns').select('id, status, subject, sent_at'),
      sb
        .from('email_campaign_recipients')
        .select('delivery_status, created_at')
        .gte('created_at', since.toISOString()),
    ])

  const byTrigger: Record<string, number> = {}
  const byStatus: Record<string, number> = {}
  const byDay: Record<string, number> = {}

  for (const row of logs ?? []) {
    const key = (row.trigger_key as string) ?? 'manual'
    byTrigger[key] = (byTrigger[key] ?? 0) + 1
    const st = row.status as string
    byStatus[st] = (byStatus[st] ?? 0) + 1
    const day = (row.created_at as string).slice(0, 10)
    byDay[day] = (byDay[day] ?? 0) + 1
  }

  const campaignDelivery: Record<string, number> = {}
  for (const row of recipients ?? []) {
    const st = row.delivery_status as string
    campaignDelivery[st] = (campaignDelivery[st] ?? 0) + 1
  }

  const { data: recent } = await sb
    .from('email_send_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)

  return res.status(200).json({
    summary: {
      transactional_30d: logs?.length ?? 0,
      campaigns_total: campaigns?.length ?? 0,
      campaign_recipients_30d: recipients?.length ?? 0,
    },
    by_trigger: byTrigger,
    by_status: byStatus,
    by_day: byDay,
    campaign_delivery: campaignDelivery,
    campaigns: campaigns ?? [],
    recent_sends: recent ?? [],
  })
}
