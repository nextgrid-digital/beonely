import { useQuery } from '@tanstack/react-query'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Tables } from '@/lib/supabase/database.types'

export type AdminCandidateRow = Tables<'job_seeker_profiles'> & {
  application_count: number
}

export function useAdminCandidates() {
  return useQuery({
    queryKey: ['admin-candidates'],
    queryFn: async (): Promise<AdminCandidateRow[]> => {
      const sb = getSupabaseBrowserClient()
      const { data: profiles, error } = await sb
        .from('job_seeker_profiles')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(500)
      if (error) throw error

      const { data: appCounts, error: appError } = await sb
        .from('applications')
        .select('candidate_user_id')
      if (appError) throw appError

      const countByUser = new Map<string, number>()
      for (const row of appCounts ?? []) {
        const uid = row.candidate_user_id as string
        countByUser.set(uid, (countByUser.get(uid) ?? 0) + 1)
      }

      return (profiles ?? []).map((p) => ({
        ...(p as Tables<'job_seeker_profiles'>),
        application_count: p.user_id ? (countByUser.get(p.user_id) ?? 0) : 0,
      }))
    },
  })
}
