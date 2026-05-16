import { useQuery } from '@tanstack/react-query'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

export type AdminPaymentRow = {
  id: string
  amount: number
  currency: string
  status: string
  created_at: string
  razorpay_order_id: string | null
  razorpay_payment_id: string | null
  job_title: string | null
  recruiter_email: string | null
  company_name: string | null
}

export function useAdminRevenue() {
  return useQuery({
    queryKey: ['admin-revenue'],
    queryFn: async (): Promise<AdminPaymentRow[]> => {
      const sb = getSupabaseBrowserClient()
      const { data, error } = await sb
        .from('payments')
        .select(
          `
          id,
          amount,
          currency,
          status,
          created_at,
          razorpay_order_id,
          razorpay_payment_id,
          jobs ( job_title ),
          recruiters ( email, company_name )
        `
        )
        .order('created_at', { ascending: false })
        .limit(500)
      if (error) throw error
      return (data ?? []).map((row) => {
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
