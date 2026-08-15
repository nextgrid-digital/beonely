import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireStaffAdmin } from '../../_lib/admin-auth.js'
import { tryGetServiceSupabase } from '../../_lib/supabase.js'

export async function handle(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }
  const admin = await requireStaffAdmin(req, res)
  if (!admin) return
  const sbInit = tryGetServiceSupabase()
  if (!sbInit.ok) return res.status(503).json({ error: sbInit.reason })

  const { data, error } = await sbInit.client.rpc('get_admin_dashboard_stats')
  if (error || !data || typeof data !== 'object' || Array.isArray(data)) {
    return res.status(503).json({ error: 'stats_unavailable' })
  }
  res.setHeader('Cache-Control', 'private, no-store')
  return res.status(200).json({ stats: data })
}
