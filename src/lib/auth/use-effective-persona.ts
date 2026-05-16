import { useAuth } from '@/context/auth-provider'
import { useAdminWorkspace } from '@/context/admin-workspace-provider'
import type { ProfileRow } from '@/lib/supabase/database.types'

export type EffectivePersona = ProfileRow['role']

/** UI persona for staff preview: candidate/recruiter when workspace switched. */
export function useEffectivePersona(): EffectivePersona {
  const { profile } = useAuth()
  const { isStaffAdmin, workspace } = useAdminWorkspace()
  if (!profile) return 'candidate'
  if (profile.role !== 'admin' || !isStaffAdmin) return profile.role
  if (workspace === 'candidate') return 'candidate'
  if (workspace === 'recruiter') return 'recruiter'
  if (workspace === 'public') return 'candidate'
  return 'admin'
}

export function useEffectiveProfile(): ProfileRow | null {
  const { profile } = useAuth()
  const persona = useEffectivePersona()
  if (!profile) return null
  if (profile.role !== 'admin') return profile
  return { ...profile, role: persona }
}
