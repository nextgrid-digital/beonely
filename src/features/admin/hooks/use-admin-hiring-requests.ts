import { useQuery } from '@tanstack/react-query'
import { fetchAdminHiringRequests, type HiringRequestRow } from '@/lib/hiring-requests'
import { useAuth } from '@/context/auth-provider'

export function useAdminHiringRequests() {
  const { session, profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const accessToken = session?.access_token

  return useQuery({
    queryKey: ['admin-hiring-requests'],
    enabled: Boolean(isAdmin && accessToken),
    queryFn: async (): Promise<HiringRequestRow[]> =>
      fetchAdminHiringRequests(accessToken!),
  })
}
