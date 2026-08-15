import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import type { RecruiterRow } from '@/lib/supabase/database.types'
import { useAuth } from '@/context/auth-provider'

export function useAdminRecruiters() {
  const { profile, session } = useAuth()
  const accessToken = session?.access_token

  return useQuery({
    queryKey: ['admin-recruiters', accessToken],
    enabled: Boolean(accessToken && profile?.role === 'admin'),
    queryFn: async (): Promise<RecruiterRow[]> => {
      if (!accessToken) throw new Error('missing_access_token')
      const result = await apiGet<{ recruiters: RecruiterRow[] }>(
        '/api/admin/directory/recruiters',
        accessToken
      )
      return result.recruiters
    },
  })
}
