import type { VercelRequest, VercelResponse } from '@vercel/node'
import { isAllowlistedAdminEmail } from './admin-access.js'
import type { AuthUser } from './auth-types.js'
import { getUserFromBearer, tryGetServiceSupabase } from './supabase.js'

export async function requireStaffAdmin(
  req: VercelRequest,
  res: VercelResponse
): Promise<AuthUser | null> {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
  const { user } = await getUserFromBearer(token)
  if (!user) {
    res.status(401).json({ error: 'unauthorized' })
    return null
  }

  if (
    !user.email ||
    !user.email_confirmed_at ||
    !isAllowlistedAdminEmail(user.email)
  ) {
    res.status(403).json({ error: 'forbidden' })
    return null
  }

  const sbInit = tryGetServiceSupabase()
  if (!sbInit.ok) {
    res.status(503).json({ error: 'admin_auth_unavailable' })
    return null
  }

  const { data: recruiter, error: recruiterError } = await sbInit.client
    .from('recruiters')
    .select('role, disabled')
    .eq('user_id', user.id)
    .maybeSingle()

  if (recruiterError) {
    res.status(503).json({ error: 'admin_auth_unavailable' })
    return null
  }

  if (recruiter?.role !== 'admin' || recruiter.disabled === true) {
    res.status(403).json({ error: 'forbidden' })
    return null
  }
  return user
}
