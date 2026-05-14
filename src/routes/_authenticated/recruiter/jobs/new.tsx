import { createFileRoute } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { RecruiterJobEditorPage } from '@/features/recruiter/recruiter-job-editor-page'
import { useAuth } from '@/context/auth-provider'
import {
  getSupabaseBrowserClient,
  getSupabaseConfigured,
} from '@/lib/supabase/client'
import type { RecruiterRow } from '@/lib/supabase/database.types'

export const Route = createFileRoute('/_authenticated/recruiter/jobs/new')({
  component: RecruiterJobNewRoute,
})

function RecruiterJobNewRoute() {
  const { user } = useAuth()

  const recruiterQuery = useQuery({
    queryKey: ['recruiter', user?.id],
    enabled: Boolean(user && getSupabaseConfigured()),
    queryFn: async () => {
      const sb = getSupabaseBrowserClient()
      const { data, error } = await sb
        .from('recruiters')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle()
      if (error) throw error
      return data as RecruiterRow | null
    },
  })

  if (!getSupabaseConfigured()) {
    return (
      <p className='text-sm text-muted-foreground'>
        Connect Supabase to manage listings.
      </p>
    )
  }

  if (recruiterQuery.isLoading) {
    return <Loader2 className='size-6 animate-spin text-muted-foreground' />
  }

  const recruiter = recruiterQuery.data
  if (!recruiter) {
    return (
      <p className='text-sm text-muted-foreground'>
        Complete your recruiter profile from My jobs first.
      </p>
    )
  }

  return <RecruiterJobEditorPage recruiter={recruiter} job={null} />
}
