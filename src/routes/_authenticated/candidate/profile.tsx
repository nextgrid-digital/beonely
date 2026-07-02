import { useLayoutEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useRouterState } from '@tanstack/react-router'
import { withTimeout } from '@/lib/async/with-timeout'
import type { AccountResumePrefill } from '@/lib/candidate/resume-prefill'
import { syncJobSeekerFromUserMetadata } from '@/lib/candidate/sync-job-seeker-from-metadata'
import { formatQueryError } from '@/lib/format-query-error'
import {
  getSupabaseBrowserClient,
  getSupabaseConfigured,
} from '@/lib/supabase/client'
import { useAuth } from '@/context/auth-provider'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { CandidateResumeBuilder } from '@/features/candidate/resume-builder/candidate-resume-builder'
import { PUBLIC_SITE_MAIN_COLUMN } from '@/features/jobs/public-site-layout'

export const Route = createFileRoute('/_authenticated/candidate/profile')({
  component: CandidateProfilePage,
})

const PROFILE_FETCH_TIMEOUT_MS = 20_000

function CandidateProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const locationHash = useRouterState({ select: (s) => s.location.hash })

  // eslint-disable-next-line @tanstack/query/exhaustive-deps -- user id in queryKey is sufficient
  const profileQuery = useQuery({
    queryKey: ['job-seeker-profile', user?.id],
    enabled: Boolean(user && !authLoading && getSupabaseConfigured()),
    queryFn: async () => {
      const run = async () => {
        const sb = getSupabaseBrowserClient()
        const u = user!
        await syncJobSeekerFromUserMetadata(sb, u)
        const { data, error } = await sb
          .from('job_seeker_profiles')
          .select('*')
          .eq('user_id', u.id)
          .maybeSingle()
        if (error) throw error
        return data
      }
      return withTimeout(
        run(),
        PROFILE_FETCH_TIMEOUT_MS,
        `Profile could not load within ${PROFILE_FETCH_TIMEOUT_MS / 1000}s. Check your network and Supabase project.`
      )
    },
  })

  useLayoutEffect(() => {
    if (locationHash !== '#resume') return
    requestAnimationFrame(() => {
      document.getElementById('resume')?.scrollIntoView({ behavior: 'smooth' })
    })
  }, [locationHash])

  if (!getSupabaseConfigured()) {
    return (
      <p className='px-4 py-6 text-sm text-muted-foreground'>
        Connect Supabase to edit your profile.
      </p>
    )
  }

  if (authLoading || !user) {
    return <p className='px-4 py-6 text-sm text-muted-foreground'>Loading…</p>
  }

  if (profileQuery.isError) {
    const errMsg = formatQueryError(
      profileQuery.error,
      'Something went wrong while loading your profile.'
    )
    return (
      <div className='mx-auto max-w-lg space-y-4 px-4 py-6'>
        <Alert variant='destructive'>
          <AlertTitle>Could not load profile</AlertTitle>
          <AlertDescription>{errMsg}</AlertDescription>
        </Alert>
        <Button
          type='button'
          variant='outline'
          onClick={() => void profileQuery.refetch()}
        >
          Try again
        </Button>
      </div>
    )
  }

  if (profileQuery.isLoading) {
    return <p className='px-4 py-6 text-sm text-muted-foreground'>Loading…</p>
  }

  const userMeta = user.user_metadata as
    | {
        linkedin_url?: unknown
        phone?: unknown
        full_name?: unknown
        name?: unknown
      }
    | undefined
  const metaLinkedin =
    typeof userMeta?.linkedin_url === 'string'
      ? userMeta.linkedin_url.trim()
      : null
  const metaPhone =
    typeof userMeta?.phone === 'string' ? userMeta.phone.trim() : null
  const metaFullName =
    typeof userMeta?.full_name === 'string' && userMeta.full_name.trim()
      ? userMeta.full_name.trim()
      : typeof userMeta?.name === 'string' && userMeta.name.trim()
        ? userMeta.name.trim()
        : null

  const accountResumePrefill: AccountResumePrefill = profileQuery.data
    ? {
        email: profileQuery.data.email,
        full_name: profileQuery.data.full_name?.trim() || metaFullName,
        phone: profileQuery.data.phone,
        linkedin_url: profileQuery.data.linkedin_url,
        portfolio_url: profileQuery.data.portfolio_url,
      }
    : {
        email: user.email ?? '',
        full_name: metaFullName,
        phone: metaPhone,
        linkedin_url: metaLinkedin,
        portfolio_url: null,
      }

  return (
    <div className={`${PUBLIC_SITE_MAIN_COLUMN} flex min-h-svh flex-col pb-12`}>
      <CandidateResumeBuilder
        key={
          profileQuery.data?.id != null
            ? `${profileQuery.data.id}:${JSON.stringify(profileQuery.data.resume_structured ?? {})}`
            : `no-profile:${user.id}`
        }
        userId={user.id}
        userEmail={user.email ?? ''}
        profileRow={profileQuery.data}
        accountProfile={accountResumePrefill}
      />
    </div>
  )
}
