import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireStaffAdmin } from '../../_lib/admin-auth.js'
import { tryGetServiceSupabase } from '../../_lib/supabase.js'

const PAGE_SIZE = 1_000

export async function handle(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }
  const admin = await requireStaffAdmin(req, res)
  if (!admin) return
  const sbInit = tryGetServiceSupabase()
  if (!sbInit.ok) return res.status(503).json({ error: sbInit.reason })
  const sb = sbInit.client

  const profiles: Array<Record<string, unknown>> = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await sb
      .from('job_seeker_profiles')
      .select('*')
      .order('updated_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)
    if (error) return res.status(503).json({ error: 'candidates_unavailable' })
    const page = (data ?? []) as Array<Record<string, unknown>>
    profiles.push(...page)
    if (page.length < PAGE_SIZE) break
  }

  const countByUser = new Map<string, number>()
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await sb
      .from('applications')
      .select('candidate_user_id')
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1)
    if (error)
      return res.status(503).json({ error: 'applications_unavailable' })
    const page = data ?? []
    for (const row of page) {
      const userId = row.candidate_user_id as string
      countByUser.set(userId, (countByUser.get(userId) ?? 0) + 1)
    }
    if (page.length < PAGE_SIZE) break
  }

  const candidates = profiles.map((profile) => ({
    ...profile,
    application_count:
      typeof profile.user_id === 'string'
        ? (countByUser.get(profile.user_id) ?? 0)
        : 0,
  }))
  res.setHeader('Cache-Control', 'private, no-store')
  return res.status(200).json({ candidates })
}
