import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { useAuth } from '@/context/auth-provider'

export type AdminDashboardStats = {
  revenueAllTimeInr: number
  revenue30dInr: number
  pendingModeration: number
  activeListings: number
  recruiterCount: number
  candidateCount: number
  campaignsNeedingAttention: number
  emailFailures7d: number
}

function numberField(row: Record<string, unknown>, key: string): number {
  const value = row[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

export function useAdminDashboardStats() {
  const { session } = useAuth()
  const accessToken = session?.access_token
  return useQuery({
    queryKey: ['admin-dashboard-stats', accessToken],
    enabled: Boolean(accessToken),
    queryFn: async (): Promise<AdminDashboardStats> => {
      if (!accessToken) throw new Error('missing_access_token')
      const response = await apiGet<{ stats: unknown }>(
        '/api/admin/dashboard-stats',
        accessToken
      )
      const data = response.stats
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('invalid_admin_dashboard_stats')
      }
      const row = data as Record<string, unknown>

      return {
        revenueAllTimeInr: numberField(row, 'revenue_all_time_inr'),
        revenue30dInr: numberField(row, 'revenue_30d_inr'),
        pendingModeration: numberField(row, 'pending_moderation'),
        activeListings: numberField(row, 'active_listings'),
        recruiterCount: numberField(row, 'recruiter_count'),
        candidateCount: numberField(row, 'candidate_count'),
        campaignsNeedingAttention: numberField(
          row,
          'campaigns_needing_attention'
        ),
        emailFailures7d: numberField(row, 'email_failures_7d'),
      }
    },
  })
}
