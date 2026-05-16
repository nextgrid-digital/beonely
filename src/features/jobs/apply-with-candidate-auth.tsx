import { useCallback, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { ExternalLink, Loader2, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import {
  signInCardDescription,
  signInCardTitle,
} from '@/lib/auth/sign-in-intent'
import { isJobSeekerProfileComplete } from '@/lib/candidate/profile-completion'
import { sanitizeProfileReturnTo } from '@/lib/candidate/sanitize-return-to'
import { syncJobSeekerFromUserMetadata } from '@/lib/candidate/sync-job-seeker-from-metadata'
import {
  applyButtonAriaLabel,
  applyButtonLabel,
  isBeonelyApplyJob,
  showLinkedInBrand,
} from '@/lib/jobs/apply-target'
import { submitBeonelyApplication } from '@/lib/jobs/submit-beonely-application'
import {
  getSupabaseBrowserClient,
  getSupabaseConfigured,
} from '@/lib/supabase/client'
import type { JobRow, ProfileRow } from '@/lib/supabase/database.types'
import { useAuth } from '@/context/auth-provider'
import { Button } from '@/components/ui/button'
import { AuthModal } from '@/features/auth/auth-modal'

function LinkedInLogoMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox='0 0 24 24'
      aria-hidden
      focusable='false'
    >
      <path
        fill='#0A66C2'
        d='M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z'
      />
    </svg>
  )
}

export type ApplyJob = Pick<
  JobRow,
  | 'id'
  | 'recruiter_id'
  | 'apply_url'
  | 'source_kind'
  | 'job_slug'
  | 'job_title'
>

function applyFlowErrorMessage(error: unknown): string {
  const fallback = 'Could not continue with this application. Please try again.'
  if (!(error instanceof Error)) return fallback
  const msg = error.message.trim()
  if (!msg) return fallback
  if (/not signed in/i.test(msg)) return 'Please sign in again and retry.'
  if (/complete your profile first/i.test(msg)) return msg
  return msg
}

const recruiterApplyRedirectMessage =
  'Recruiter accounts cannot apply with a Beonely profile. Redirecting to your recruiter dashboard.'

async function fetchJobSeekerCompletionRow(userId: string) {
  const sb = getSupabaseBrowserClient()
  const { data, error } = await sb
    .from('job_seeker_profiles')
    .select('linkedin_url, phone')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

async function fetchJobSeekerSnapshotRow(userId: string) {
  const sb = getSupabaseBrowserClient()
  const { data, error } = await sb
    .from('job_seeker_profiles')
    .select(
      'email, full_name, phone, linkedin_url, portfolio_url, resume_structured, resume_storage_path'
    )
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

export function ApplyWithCandidateAuth({ job }: { job: ApplyJob }) {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [authOpen, setAuthOpen] = useState(false)
  const [authKey, setAuthKey] = useState(0)
  const linkedInApply = showLinkedInBrand(job)
  const beonely = isBeonelyApplyJob(job)

  const beonelyAppliedQuery = useQuery({
    queryKey: ['beonely-application', user?.id, job.id],
    enabled: Boolean(
      user && getSupabaseConfigured() && beonely && profile?.role === 'candidate'
    ),
    queryFn: async () => {
      try {
        const sb = getSupabaseBrowserClient()
        const { data, error } = await sb
          .from('applications')
          .select('id')
          .eq('job_id', job.id)
          .eq('candidate_user_id', user!.id)
          .maybeSingle()
        if (error) throw error
        return Boolean(data)
      } catch (error) {
        toast.error(
          'Could not verify your application status right now. You can still continue.'
        )
        return false
      }
    },
  })

  const { mutate: applyBeonelyMutate, isPending: applyBeonelyPending } =
    useMutation({
    mutationFn: async () => {
      const sb = getSupabaseBrowserClient()
      const { data: authUserRes } = await sb.auth.getUser()
      const authUser = authUserRes.user
      if (!authUser) throw new Error('Not signed in')
      await syncJobSeekerFromUserMetadata(sb, authUser)
      const row = await fetchJobSeekerSnapshotRow(authUser.id)
      if (!row) throw new Error('Complete your profile first')
      const { error } = await submitBeonelyApplication({
        sb,
        job,
        authUser,
        jobSeekerRow: {
          email: row.email,
          full_name: row.full_name,
          phone: row.phone,
          linkedin_url: row.linkedin_url,
          portfolio_url: row.portfolio_url,
          resume_structured: row.resume_structured,
          resume_storage_path: row.resume_storage_path,
        },
      })
      if (error) throw new Error(error)
    },
    onSuccess: () => {
      toast.success('Application sent to the employer')
      void qc.invalidateQueries({
        queryKey: ['beonely-application', user?.id, job.id],
      })
      void qc.invalidateQueries({ queryKey: ['beonely-applications'] })
      void qc.invalidateQueries({ queryKey: ['recruiter-jobs'] })
      void qc.invalidateQueries({ queryKey: ['job-applicants', job.id] })
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Could not submit application')
    },
  })

  const openExternalApply = useCallback(() => {
    window.open(job.apply_url, '_blank', 'noopener,noreferrer')
  }, [job.apply_url])

  const goProfileOrApply = useCallback(
    async (authProfile: ProfileRow | null) => {
      try {
        if (!getSupabaseConfigured()) return
        const sb = getSupabaseBrowserClient()
        const { data: authUserRes } = await sb.auth.getUser()
        const authUser = authUserRes.user
        if (!authUser) return

        if (authProfile?.role === 'recruiter' || authProfile?.role === 'admin') {
          if (beonely) {
            toast.message(recruiterApplyRedirectMessage)
            void navigate({ to: '/recruiter' })
            return
          }
          openExternalApply()
          return
        }

        await syncJobSeekerFromUserMetadata(sb, authUser)
        const row = await fetchJobSeekerCompletionRow(authUser.id)
        if (!isJobSeekerProfileComplete(row)) {
          const returnTo = `/jobs/${job.job_slug}`
          void navigate({
            to: '/candidate/profile',
            search: { returnTo },
          })
          return
        }
        if (beonely) {
          const full = await fetchJobSeekerSnapshotRow(authUser.id)
          if (!full) {
            toast.error('Complete your profile first')
            return
          }
          const { error } = await submitBeonelyApplication({
            sb,
            job,
            authUser,
            jobSeekerRow: {
              email: full.email,
              full_name: full.full_name,
              phone: full.phone,
              linkedin_url: full.linkedin_url,
              portfolio_url: full.portfolio_url,
              resume_structured: full.resume_structured,
              resume_storage_path: full.resume_storage_path,
            },
          })
          if (error) {
            toast.error(error)
            return
          }
          toast.success('Application sent to the employer')
          void qc.invalidateQueries({
            queryKey: ['beonely-application', authUser.id, job.id],
          })
          void qc.invalidateQueries({ queryKey: ['beonely-applications'] })
          void qc.invalidateQueries({ queryKey: ['recruiter-jobs'] })
          void qc.invalidateQueries({ queryKey: ['job-applicants', job.id] })
          return
        }
        openExternalApply()
      } catch (error) {
        toast.error(applyFlowErrorMessage(error))
      }
    },
    [beonely, job, navigate, openExternalApply, qc]
  )

  const handleApplyClick = useCallback(async () => {
    try {
      if (!user) {
        setAuthKey((k) => k + 1)
        setAuthOpen(true)
        return
      }
      if (!getSupabaseConfigured()) return
      if (profile?.role === 'recruiter' || profile?.role === 'admin') {
        if (beonely) {
          toast.message(recruiterApplyRedirectMessage)
          void navigate({ to: '/recruiter' })
          return
        }
        openExternalApply()
        return
      }
      const sb = getSupabaseBrowserClient()
      await syncJobSeekerFromUserMetadata(sb, user)
      const row = await fetchJobSeekerCompletionRow(user.id)
      if (!isJobSeekerProfileComplete(row)) {
        const returnTo = sanitizeProfileReturnTo(`/jobs/${job.job_slug}`)
        void navigate({
          to: '/candidate/profile',
          search: returnTo ? { returnTo } : {},
        })
        return
      }
      if (beonely) {
        applyBeonelyMutate()
        return
      }
      openExternalApply()
    } catch (error) {
      toast.error(applyFlowErrorMessage(error))
    }
  }, [
    user,
    profile?.role,
    navigate,
    openExternalApply,
    job.job_slug,
    beonely,
    applyBeonelyMutate,
  ])

  const applied = Boolean(beonelyAppliedQuery.data)
  const disabled = applyBeonelyPending || (beonely && applied)
  const checkingApplied =
    Boolean(beonely) &&
    profile?.role === 'candidate' &&
    !applied &&
    !beonelyAppliedQuery.isFetched &&
    (beonelyAppliedQuery.isPending || beonelyAppliedQuery.isFetching)

  return (
    <>
      <Button
        type='button'
        variant='outline'
        size='lg'
        disabled={disabled}
        aria-busy={checkingApplied || undefined}
        className='inline-flex items-center gap-2 bg-white shadow-xs hover:bg-slate-50 dark:bg-background dark:hover:bg-muted'
        onClick={() => void handleApplyClick()}
        aria-label={applyButtonAriaLabel(job)}
      >
        {linkedInApply ? (
          <>
            <LinkedInLogoMark className='size-5 shrink-0' />
            {applyButtonLabel(job)}
          </>
        ) : beonely ? (
          <>
            {checkingApplied ? (
              <Loader2
                className='size-5 shrink-0 animate-spin'
                aria-hidden
              />
            ) : (
              <UserRound className='size-5 shrink-0' aria-hidden />
            )}
            {applied ? 'Applied' : applyButtonLabel(job)}
          </>
        ) : (
          <>
            {applyButtonLabel(job)}
            <ExternalLink className='size-4 shrink-0' aria-hidden />
          </>
        )}
      </Button>
      <AuthModal
        key={authKey}
        open={authOpen}
        onOpenChange={setAuthOpen}
        title={signInCardTitle('candidate')}
        description={signInCardDescription('candidate')}
        signUpIntent='candidate'
        onAuthComplete={(p) => {
          void goProfileOrApply(p)
        }}
      />
    </>
  )
}
