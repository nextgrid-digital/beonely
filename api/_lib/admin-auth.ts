import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { AuthUser } from './auth-types.js'
import { isAllowlistedAdminEmail } from './admin-access.js'
import { getUserFromBearer } from './supabase.js'

export async function requireStaffAdmin(
  req: VercelRequest,
  res: VercelResponse
): Promise<AuthUser | null> {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
  const { user, error } = await getUserFromBearer(token)
  if (!user?.email || !isAllowlistedAdminEmail(user.email)) {
    res.status(403).json({ error: error ?? 'forbidden' })
    return null
  }
  return user
}
