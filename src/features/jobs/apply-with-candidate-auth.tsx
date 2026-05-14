import { useCallback, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'
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
  showLinkedInBrand,
} from '@/lib/jobs/apply-target'
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

type ApplyJob = Pick<
  JobRow,
  'apply_url' | 'source_kind' | 'job_slug' | 'job_title'
>

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

export function ApplyWithCandidateAuth({ job }: { job: ApplyJob }) {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [authOpen, setAuthOpen] = useState(false)
  const [authKey, setAuthKey] = useState(0)
  const linkedInApply = showLinkedInBrand(job)

  const openExternalApply = useCallback(() => {
    window.open(job.apply_url, '_blank', 'noopener,noreferrer')
  }, [job.apply_url])

  const goProfileOrApply = useCallback(
    async (authProfile: ProfileRow | null) => {
      if (!getSupabaseConfigured()) return
      const sb = getSupabaseBrowserClient()
      const { data: authUserRes } = await sb.auth.getUser()
      const authUser = authUserRes.user
      if (!authUser) return

      if (authProfile?.role === 'recruiter' || authProfile?.role === 'admin') {
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
      openExternalApply()
    },
    [job.job_slug, navigate, openExternalApply]
  )

  const handleApplyClick = useCallback(async () => {
    if (!user) {
      setAuthKey((k) => k + 1)
      setAuthOpen(true)
      return
    }
    if (!getSupabaseConfigured()) return
    if (profile?.role === 'recruiter' || profile?.role === 'admin') {
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
    openExternalApply()
  }, [user, profile?.role, navigate, openExternalApply, job.job_slug])

  return (
    <>
      <Button
        type='button'
        variant='outline'
        size='lg'
        className='inline-flex items-center gap-2 bg-white shadow-xs hover:bg-slate-50 dark:bg-background dark:hover:bg-muted'
        onClick={() => void handleApplyClick()}
        aria-label={applyButtonAriaLabel(job)}
      >
        {linkedInApply ? (
          <>
            <LinkedInLogoMark className='size-5 shrink-0' />
            {applyButtonLabel(job)}
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
