import { useQuery } from '@tanstack/react-query'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

export type AdminDashboardStats = {
  revenueAllTimeInr: number
  revenue30dInr: number
  pendingModeration: number
  activeListings: number
  recruiterCount: number
  candidateCount: number
}

function sumPaidInr(
  rows: { amount: number; currency: string | null; status: string }[]
): number {
  return rows
    .filter((r) => r.status === 'paid')
    .reduce((sum, r) => {
      if (r.currency && r.currency !== 'INR') return sum
      return sum + r.amount / 100
    }, 0)
}

export function useAdminDashboardStats() {
  return useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async (): Promise<AdminDashboardStats> => {
      const sb = getSupabaseBrowserClient()
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const iso30 = thirtyDaysAgo.toISOString()
      const now = new Date().toISOString()

      const [
        paymentsAllRes,
        payments30Res,
        pendingRes,
        activeRes,
        recruitersRes,
        candidatesRes,
      ] = await Promise.all([
        sb
          .from('payments')
          .select('amount, currency, status')
          .eq('status', 'paid'),
        sb
          .from('payments')
          .select('amount, currency, status, created_at')
          .eq('status', 'paid')
          .gte('created_at', iso30),
        sb
          .from('jobs')
          .select('id, payment_status, source_kind')
          .eq('approval_status', 'pending'),
        sb
          .from('jobs')
          .select('id', { count: 'exact', head: true })
          .eq('approval_status', 'approved')
          .eq('payment_status', 'paid')
          .or(`listing_expires_at.is.null,listing_expires_at.gt.${now}`),
        sb.from('recruiters').select('id', { count: 'exact', head: true }),
        sb
          .from('job_seeker_profiles')
          .select('id', { count: 'exact', head: true }),
      ])

      const firstError =
        paymentsAllRes.error ??
        payments30Res.error ??
        pendingRes.error ??
        activeRes.error ??
        recruitersRes.error ??
        candidatesRes.error
      if (firstError) throw firstError

      const pendingModeration = (pendingRes.data ?? []).filter(
        (j) =>
          j.payment_status === 'paid' || j.source_kind === 'linkedin_import'
      ).length

      return {
        revenueAllTimeInr: sumPaidInr(paymentsAllRes.data ?? []),
        revenue30dInr: sumPaidInr(payments30Res.data ?? []),
        pendingModeration,
        activeListings: activeRes.count ?? 0,
        recruiterCount: recruitersRes.count ?? 0,
        candidateCount: candidatesRes.count ?? 0,
      }
    },
  })
}
