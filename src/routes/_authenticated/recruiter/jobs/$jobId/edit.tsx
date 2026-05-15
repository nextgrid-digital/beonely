import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { RecruiterJobEditorPage } from '@/features/recruiter/recruiter-job-editor-page'
import { useAuth } from '@/context/auth-provider'
import {
  getSupabaseBrowserClient,
  getSupabaseConfigured,
} from '@/lib/supabase/client'
import type { JobRow, RecruiterRow } from '@/lib/supabase/database.types'

export const Route = createFileRoute(
  '/_authenticated/recruiter/jobs/$jobId/edit'
)({
  component: RecruiterJobEditRoute,
})

const uuidRe =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function RecruiterJobEditRoute() {
  const { jobId } = Route.useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => {
    if (!uuidRe.test(jobId)) {
      void navigate({ to: '/recruiter', replace: true })
    }
  }, [jobId, navigate])

  const recruiterQuery = useQuery({
    queryKey: ['recruiter', user?.id],
    enabled: Boolean(user && getSupabaseConfigured() && uuidRe.test(jobId)),
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

  const jobQuery = useQuery({
    queryKey: ['recruiter-job', jobId],
    enabled: Boolean(
      recruiterQuery.data?.id && uuidRe.test(jobId) && getSupabaseConfigured()
    ),
    queryFn: async () => {
      const sb = getSupabaseBrowserClient()
      const { data, error } = await sb
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .maybeSingle()
      if (error) throw error
      return data as JobRow | null
    },
  })

  useEffect(() => {
    if (!recruiterQuery.isSuccess || !jobQuery.isSuccess) return
    const recruiter = recruiterQuery.data
    const job = jobQuery.data
    if (!recruiter || !job || job.recruiter_id !== recruiter.id) {
      void navigate({ to: '/recruiter', replace: true })
    }
  }, [
    recruiterQuery.isSuccess,
    recruiterQuery.data,
    jobQuery.isSuccess,
    jobQuery.data,
    navigate,
  ])

  if (!uuidRe.test(jobId)) {
    return null
  }

  if (!getSupabaseConfigured()) {
    return (
      <p className='text-sm text-muted-foreground'>
        Connect Supabase to manage listings.
      </p>
    )
  }

  if (recruiterQuery.isLoading || jobQuery.isLoading) {
    return <Loader2 className='size-6 animate-spin text-muted-foreground' />
  }

  const recruiter = recruiterQuery.data
  const job = jobQuery.data
  if (!recruiter || !job || job.recruiter_id !== recruiter.id) {
    return null
  }

  return <RecruiterJobEditorPage recruiter={recruiter} job={job} />
}
