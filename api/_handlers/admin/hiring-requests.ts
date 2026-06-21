import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireStaffAdmin } from '../../_lib/admin-auth.js'
import { tryGetServiceSupabase } from '../../_lib/supabase.js'

export async function handle(req: VercelRequest, res: VercelResponse) {
  const admin = await requireStaffAdmin(req, res)
  if (!admin) return

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const sbInit = tryGetServiceSupabase()
  if (!sbInit.ok) {
    return res.status(500).json({ error: sbInit.reason })
  }
  const sb = sbInit.client

  const { data, error } = await sb
    .from('hiring_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json({ requests: data ?? [] })
}
