import { useQuery } from '@tanstack/react-query'
import {
  fetchAdminHiringRequests,
  type HiringRequestRow,
} from '@/lib/hiring-requests'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/auth-provider'

export function useAdminHiringRequests() {
  const { session, profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const accessToken = session?.access_token

  return useQuery({
    queryKey: ['admin-hiring-requests', session?.user.id],
    enabled: Boolean(isAdmin && accessToken),
    queryFn: async (): Promise<HiringRequestRow[]> => {
      const current = await getSupabaseBrowserClient().auth.getSession()
      const token = current.data.session?.access_token
      if (!token) throw new Error('missing_access_token')
      return fetchAdminHiringRequests(token)
    },
  })
}
