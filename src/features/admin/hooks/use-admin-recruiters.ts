import { useQuery } from '@tanstack/react-query'
import {
  getSupabaseBrowserClient,
  getSupabaseConfigured,
} from '@/lib/supabase/client'
import type { RecruiterRow } from '@/lib/supabase/database.types'
import { useAuth } from '@/context/auth-provider'

export function useAdminRecruiters() {
  const { profile } = useAuth()
  const configured = getSupabaseConfigured()
  const isAdmin = profile?.role === 'admin'

  return useQuery({
    queryKey: ['admin-recruiters'],
    enabled: Boolean(configured && isAdmin),
    queryFn: async (): Promise<RecruiterRow[]> => {
      const sb = getSupabaseBrowserClient()
      const { data, error } = await sb
        .from('recruiters')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as RecruiterRow[]
    },
  })
}
