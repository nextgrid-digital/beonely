import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import type { Tables } from '@/lib/supabase/database.types'
import { useAuth } from '@/context/auth-provider'

export type AdminCandidateRow = Tables<'job_seeker_profiles'> & {
  application_count: number
}

export function useAdminCandidates() {
  const { session } = useAuth()
  const accessToken = session?.access_token
  return useQuery({
    queryKey: ['admin-candidates', accessToken],
    enabled: Boolean(accessToken),
    queryFn: async (): Promise<AdminCandidateRow[]> => {
      if (!accessToken) throw new Error('missing_access_token')
      const result = await apiGet<{ candidates: AdminCandidateRow[] }>(
        '/api/admin/directory/candidates',
        accessToken
      )
      return result.candidates
    },
  })
}
