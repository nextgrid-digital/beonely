import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
} from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { formatQueryError } from '@/lib/format-query-error'
import { recruiterOwnsJob } from '@/lib/jobs/recruiter-owned-job'
import {
  getSupabaseBrowserClient,
  getSupabaseConfigured,
} from '@/lib/supabase/client'
import type { JobRow, RecruiterRow } from '@/lib/supabase/database.types'
import { useAuth } from '@/context/auth-provider'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { RecruiterJobWorkspaceProvider } from '@/features/recruiter/recruiter-job-workspace-context'

export const Route = createFileRoute('/_authenticated/recruiter/jobs/$jobId')({
  component: RecruiterJobWorkspaceLayout,
})

const uuidRe =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function RecruiterJobWorkspaceLayout() {
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
    if (recruiterQuery.isError || jobQuery.isError) return
    if (!recruiterQuery.isSuccess || !jobQuery.isSuccess) return
    const recruiter = recruiterQuery.data
    const job = jobQuery.data
    if (!recruiter || !job || !recruiterOwnsJob(job, recruiter.id)) {
      void navigate({ to: '/recruiter', replace: true })
    }
  }, [
    recruiterQuery.isError,
    jobQuery.isError,
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

  if (recruiterQuery.isError || jobQuery.isError) {
    const err = recruiterQuery.error ?? jobQuery.error
    return (
      <div className='max-w-lg space-y-4'>
        <Alert variant='destructive'>
          <AlertTitle>Could not load job</AlertTitle>
          <AlertDescription>
            {formatQueryError(
              err,
              'Something went wrong while loading this listing.'
            )}
          </AlertDescription>
        </Alert>
        <div className='flex flex-wrap gap-2'>
          <Button
            type='button'
            variant='outline'
            onClick={() => {
              void recruiterQuery.refetch()
              void jobQuery.refetch()
            }}
          >
            Try again
          </Button>
          <Button type='button' variant='secondary' asChild>
            <Link to='/recruiter'>Back to My jobs</Link>
          </Button>
        </div>
      </div>
    )
  }

  const recruiter = recruiterQuery.data
  const job = jobQuery.data
  if (!recruiter || !job || !recruiterOwnsJob(job, recruiter.id)) {
    return null
  }

  return (
    <RecruiterJobWorkspaceProvider value={{ jobId, recruiter, job }}>
      <Outlet />
    </RecruiterJobWorkspaceProvider>
  )
}
