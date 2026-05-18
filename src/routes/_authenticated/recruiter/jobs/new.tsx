import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { formatQueryError } from '@/lib/format-query-error'
import {
  getSupabaseBrowserClient,
  getSupabaseConfigured,
} from '@/lib/supabase/client'
import type { RecruiterRow } from '@/lib/supabase/database.types'
import { useAuth } from '@/context/auth-provider'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { RecruiterJobEditorPage } from '@/features/recruiter/recruiter-job-editor-page'

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

  if (recruiterQuery.isError) {
    return (
      <div className='max-w-lg space-y-4'>
        <Alert variant='destructive'>
          <AlertTitle>Could not load recruiter account</AlertTitle>
          <AlertDescription>
            {formatQueryError(
              recruiterQuery.error,
              'Something went wrong while loading your account.'
            )}
          </AlertDescription>
        </Alert>
        <Button
          type='button'
          variant='outline'
          onClick={() => void recruiterQuery.refetch()}
        >
          Try again
        </Button>
      </div>
    )
  }

  if (recruiterQuery.isSuccess && !recruiterQuery.data) {
    return (
      <p className='text-sm text-muted-foreground'>
        Complete your recruiter profile from{' '}
        <Link
          to='/recruiter'
          className='font-medium text-primary underline-offset-4 hover:underline'
        >
          My jobs
        </Link>{' '}
        first.
      </p>
    )
  }

  const recruiter = recruiterQuery.data
  if (!recruiter) {
    return null
  }

  return <RecruiterJobEditorPage recruiter={recruiter} job={null} />
}
