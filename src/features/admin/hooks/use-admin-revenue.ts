import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { useAuth } from '@/context/auth-provider'

export type AdminPaymentRow = {
  id: string
  amount: number
  currency: string
  status: string
  created_at: string
  paid_at: string | null
  plan: string
  payment_kind: string
  refunded_amount: number
  chargeback_amount: number
  requires_manual_review: boolean
  risk_status: string | null
  razorpay_order_id: string | null
  razorpay_payment_id: string | null
  job_title: string | null
  recruiter_email: string | null
  company_name: string | null
}

export function useAdminRevenue() {
  const { session, profile } = useAuth()
  const accessToken = session?.access_token
  const isAdmin = profile?.role === 'admin'

  return useQuery({
    queryKey: ['admin-revenue', accessToken],
    enabled: Boolean(isAdmin && accessToken),
    queryFn: async (): Promise<AdminPaymentRow[]> => {
      if (!accessToken) throw new Error('missing_access_token')
      const response = await apiGet<{ payments: Record<string, unknown>[] }>(
        '/api/admin/revenue-list',
        accessToken
      )
      return response.payments.map((row) => {
        const jobsRaw = row.jobs as
          | { job_title: string }
          | { job_title: string }[]
          | null
        const jobs = Array.isArray(jobsRaw) ? jobsRaw[0] : jobsRaw
        const recruitersRaw = row.recruiters as
          | { email: string; company_name: string }
          | { email: string; company_name: string }[]
          | null
        const recruiters = Array.isArray(recruitersRaw)
          ? recruitersRaw[0]
          : recruitersRaw
        return {
          id: row.id as string,
          amount: row.amount as number,
          currency: row.currency as string,
          status: row.status as string,
          created_at: row.created_at as string,
          paid_at: row.paid_at as string | null,
          plan: row.plan as string,
          payment_kind: row.payment_kind as string,
          refunded_amount: row.refunded_amount as number,
          chargeback_amount: row.chargeback_amount as number,
          requires_manual_review: row.requires_manual_review as boolean,
          risk_status: row.risk_status as string | null,
          razorpay_order_id: row.razorpay_order_id as string | null,
          razorpay_payment_id: row.razorpay_payment_id as string | null,
          job_title: jobs?.job_title ?? null,
          recruiter_email: recruiters?.email ?? null,
          company_name: recruiters?.company_name ?? null,
        }
      })
    },
  })
}
