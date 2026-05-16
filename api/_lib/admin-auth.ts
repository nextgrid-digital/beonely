import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { User } from '@supabase/supabase-js'
import { isAllowlistedAdminEmail } from './admin-access.js'
import { getUserFromBearer } from './supabase.js'

export async function requireStaffAdmin(
  req: VercelRequest,
  res: VercelResponse
): Promise<User | null> {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
  const { user, error } = await getUserFromBearer(token)
  if (!user?.email || !isAllowlistedAdminEmail(user.email)) {
    res.status(403).json({ error: error ?? 'forbidden' })
    return null
  }
  return user
}
