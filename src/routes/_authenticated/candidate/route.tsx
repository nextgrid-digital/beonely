import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  createFileRoute,
  Outlet,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router'
import { requireCandidateAccountBeforeLoad } from '@/lib/auth/route-guards'
import { isJobSeekerProfileComplete } from '@/lib/candidate/profile-completion'
import { syncJobSeekerFromUserMetadata } from '@/lib/candidate/sync-job-seeker-from-metadata'
import {
  getSupabaseBrowserClient,
  getSupabaseConfigured,
} from '@/lib/supabase/client'
import { formatQueryError } from '@/lib/format-query-error'
import { useAuth } from '@/context/auth-provider'
import { useEffectivePersona } from '@/lib/auth/use-effective-persona'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/_authenticated/candidate')({
  beforeLoad: () =>
    requireCandidateAccountBeforeLoad({ loginRedirectPath: '/candidate' }),
  component: CandidateSectionLayout,
})

function CandidateSectionLayout() {
  const { user } = useAuth()
  const effectivePersona = useEffectivePersona()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  // eslint-disable-next-line @tanstack/query/exhaustive-deps -- user id in queryKey is sufficient
  const completionQuery = useQuery({
    queryKey: ['job-seeker-profile-completion', user?.id],
    enabled: Boolean(
      user && getSupabaseConfigured() && effectivePersona === 'candidate'
    ),
    queryFn: async () => {
      const sb = getSupabaseBrowserClient()
      const u = user!
      await syncJobSeekerFromUserMetadata(sb, u)
      const { data, error } = await sb
        .from('job_seeker_profiles')
        .select('linkedin_url, phone')
        .eq('user_id', u.id)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })

  useEffect(() => {
    if (!user || effectivePersona !== 'candidate') return
    if (pathname.startsWith('/candidate/profile')) return
    if (completionQuery.isError) return
    if (completionQuery.isLoading || completionQuery.isFetching) return
    if (!completionQuery.isSuccess) return
    if (isJobSeekerProfileComplete(completionQuery.data)) return
    void navigate({
      to: '/candidate/profile',
      search: { returnTo: pathname },
      replace: true,
    })
  }, [
    user,
    effectivePersona,
    pathname,
    completionQuery.isError,
    completionQuery.isLoading,
    completionQuery.isFetching,
    completionQuery.isSuccess,
    completionQuery.data,
    navigate,
  ])

  return (
    <>
      {completionQuery.isError ? (
        <div className='mx-auto max-w-5xl px-4 pt-4'>
          <Alert variant='destructive'>
            <AlertTitle>Could not verify profile completion</AlertTitle>
            <AlertDescription>
              {formatQueryError(
                completionQuery.error,
                'You can still use this section. Try again or open your profile.'
              )}
            </AlertDescription>
          </Alert>
          <Button
            type='button'
            variant='outline'
            className='mt-3'
            onClick={() => void completionQuery.refetch()}
          >
            Try again
          </Button>
        </div>
      ) : null}
      <Outlet />
    </>
  )
}
