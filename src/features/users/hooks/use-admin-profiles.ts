import { useQuery } from '@tanstack/react-query'
import {
  getSupabaseBrowserClient,
  getSupabaseConfigured,
} from '@/lib/supabase/client'
import type { ProfileRow, RecruiterRow } from '@/lib/supabase/database.types'
import { useAuth } from '@/context/auth-provider'

function recruiterToProfileRow(r: RecruiterRow): ProfileRow {
  return {
    id: r.user_id,
    email: r.email,
    role: r.role === 'admin' ? 'admin' : 'recruiter',
    created_at: r.created_at,
    updated_at: r.created_at,
  }
}

export function useAdminProfiles() {
  const { profile } = useAuth()
  const configured = getSupabaseConfigured()
  const isAdmin = profile?.role === 'admin'

  return useQuery({
    queryKey: ['admin-recruiters'],
    enabled: Boolean(configured && isAdmin),
    queryFn: async (): Promise<ProfileRow[]> => {
      const sb = getSupabaseBrowserClient()
      const { data, error } = await sb
        .from('recruiters')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []).map((r) => recruiterToProfileRow(r as RecruiterRow))
    },
  })
}
