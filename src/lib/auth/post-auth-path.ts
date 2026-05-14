import type { ProfileRow } from '@/lib/supabase/database.types'

/** Default in-app landing after sign-in when no explicit redirect is set. */
export function getPostAuthPath (
  profile: ProfileRow | null
): '/recruiter' | '/candidate/profile' | '/admin' {
  if (!profile) return '/candidate/profile'
  if (profile.role === 'admin') return '/admin'
  if (profile.role === 'recruiter') return '/recruiter'
  return '/candidate/profile'
}
