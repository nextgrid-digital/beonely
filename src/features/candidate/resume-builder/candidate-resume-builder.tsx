/**
 * Candidate profile completion editor (read.cv-style preview).
 * Sign-up supplies LinkedIn + phone on `job_seeker_profiles`; this UI collects the rest.
 */
import { useRef, useState, type ChangeEventHandler } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ChevronRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  type AccountResumePrefill,
  prefillResumeFromProfile,
  shouldPrefillResumeFromAccount,
} from '@/lib/candidate/resume-prefill'
import {
  parseResumeStructured,
  type ResumeStructuredV1,
} from '@/lib/candidate/resume-structured-schema'
import { deriveProfileColumnsFromResume } from '@/lib/candidate/resume-to-profile-columns'
import { sanitizeResumeStructuredRichFields } from '@/lib/candidate/sanitize-resume-html'
import {
  uploadCandidateAvatar,
  validateCandidateAvatarFile,
} from '@/lib/candidate/upload-candidate-avatar'
import {
  getSupabaseBrowserClient,
  getSupabaseConfigured,
} from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { MarketingOptInCheckbox } from '@/components/marketing-opt-in-checkbox'
import { updateMarketingConsent } from '@/lib/email/marketing-opt-in'
import { useAuth } from '@/context/auth-provider'
import {
  PUBLIC_SITE_BREADCRUMB_LINK,
  PUBLIC_SITE_BREADCRUMB_LIST,
  PublicSiteStickySubheader,
} from '@/features/jobs/public-site-layout'
import { ReadCvResumePreview } from './read-cv-resume-preview'

export type CandidateResumeBuilderProps = {
  userId: string
  userEmail: string
  profileRow: {
    id: string
    resume_structured: unknown
    linkedin_url?: string | null
    phone?: string | null
    notification_opt_in?: boolean
    marketing_opt_in?: boolean
  } | null
  accountProfile: AccountResumePrefill
}

export function CandidateResumeBuilder({
  userId,
  userEmail,
  profileRow,
  accountProfile,
}: CandidateResumeBuilderProps) {
  const qc = useQueryClient()
  const { session } = useAuth()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [marketingOptIn, setMarketingOptIn] = useState(
    profileRow?.marketing_opt_in ?? false
  )
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<ResumeStructuredV1>(() => {
    const raw = profileRow?.resume_structured
    const parsed = parseResumeStructured(raw)
    if (shouldPrefillResumeFromAccount(raw, parsed)) {
      return prefillResumeFromProfile(parsed, accountProfile, userEmail)
    }
    return parsed
  })

  const saveResume = useMutation({
    mutationFn: async () => {
      const sb = getSupabaseBrowserClient()
      const preserve =
        profileRow != null
          ? {
              linkedin_url: profileRow.linkedin_url ?? null,
              phone: profileRow.phone ?? null,
            }
          : null
      const sanitized = sanitizeResumeStructuredRichFields(draft)
      const derived = deriveProfileColumnsFromResume(sanitized, preserve)
      const email = userEmail.trim()
      if (!email) throw new Error('missing_email')

      const resumePayload = {
        resume_structured: sanitized,
        resume_source: 'user_edit' as const,
        full_name: derived.full_name,
        portfolio_url: derived.portfolio_url,
        linkedin_url: derived.linkedin_url.trim() || null,
        phone: derived.phone.trim() || null,
      }

      if (profileRow?.id) {
        const { error } = await sb
          .from('job_seeker_profiles')
          .update({
            ...resumePayload,
            notification_opt_in: profileRow.notification_opt_in ?? true,
            marketing_opt_in: marketingOptIn,
            marketing_opt_in_at: marketingOptIn
              ? new Date().toISOString()
              : null,
          })
          .eq('id', profileRow.id)
        if (error) throw error
      } else {
        const { error } = await sb.from('job_seeker_profiles').insert({
          user_id: userId,
          email,
          ...resumePayload,
          notification_opt_in: true,
          marketing_opt_in: marketingOptIn,
          marketing_opt_in_at: marketingOptIn
            ? new Date().toISOString()
            : null,
        })
        if (error) throw error
      }
      const token = session?.access_token
      if (token) {
        await updateMarketingConsent({
          marketing_opt_in: marketingOptIn,
          audience: 'candidate',
          accessToken: token,
        })
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['job-seeker-profile', userId] })
      void qc.invalidateQueries({
        queryKey: ['job-seeker-profile-completion', userId],
      })
      setEditing(false)
      toast.success('Profile saved')
    },
    onError: (e) => {
      if ((e as Error).message === 'missing_email') {
        toast.error('Your account needs an email address to save your profile.')
      } else {
        toast.error('Could not save profile')
      }
    },
  })

  const onAvatarFileChange: ChangeEventHandler<HTMLInputElement> = async (
    e
  ) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!getSupabaseConfigured()) {
      toast.error('Connect Supabase to upload a photo.')
      return
    }
    const validation = validateCandidateAvatarFile(file)
    if (validation) {
      toast.error(validation)
      return
    }
    setAvatarBusy(true)
    try {
      const sb = getSupabaseBrowserClient()
      const url = await uploadCandidateAvatar(sb, userId, file)
      setDraft((d) => ({ ...d, general: { ...d.general, avatar: url } }))
      toast.success('Photo uploaded. Save your profile to keep it.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not upload photo')
    } finally {
      setAvatarBusy(false)
    }
  }

  const profilePhotoUploadButton = (
    <Button
      type='button'
      variant='secondary'
      size='sm'
      className='border-0 bg-white/95 px-2 py-1 text-[10px] font-medium text-slate-900 shadow-sm hover:bg-white sm:text-xs'
      disabled={avatarBusy || !getSupabaseConfigured()}
      aria-label='Upload profile picture. JPEG, PNG, or WebP. Maximum 5 megabytes.'
      onClick={() => avatarInputRef.current?.click()}
    >
      {avatarBusy ? (
        <Loader2 className='mx-auto size-4 animate-spin' aria-hidden />
      ) : null}
      {avatarBusy ? 'Uploading…' : 'Upload'}
    </Button>
  )

  return (
    <div className='w-full pt-2'>
      <input
        ref={avatarInputRef}
        type='file'
        accept='image/jpeg,image/png,image/webp'
        className='sr-only'
        onChange={onAvatarFileChange}
      />
      <PublicSiteStickySubheader
        breadcrumb={
          <ol className={PUBLIC_SITE_BREADCRUMB_LIST}>
            <li className='inline-flex items-center gap-2'>
              <Link to='/' className={PUBLIC_SITE_BREADCRUMB_LINK}>
                Home
              </Link>
              <ChevronRight
                className='size-4 shrink-0 opacity-60'
                aria-hidden
              />
            </li>
            <li className='font-medium text-stone-800' aria-current='page'>
              Profile
            </li>
          </ol>
        }
        actions={
          editing ? (
            <Button
              type='button'
              size='sm'
              disabled={saveResume.isPending}
              onClick={() => saveResume.mutate()}
            >
              {saveResume.isPending ? 'Saving…' : 'Save profile'}
            </Button>
          ) : (
            <Button
              type='button'
              size='sm'
              variant='outline'
              onClick={() => setEditing(true)}
            >
              Edit
            </Button>
          )
        }
      />

      <div className='mb-6 max-w-xl'>
        <MarketingOptInCheckbox
          checked={marketingOptIn}
          disabled={saveResume.isPending}
          onCheckedChange={async (checked) => {
            setMarketingOptIn(checked)
            const token = session?.access_token
            if (!token) return
            try {
              await updateMarketingConsent({
                marketing_opt_in: checked,
                audience: 'candidate',
                accessToken: token,
              })
              toast.success(checked ? 'Marketing preferences updated' : 'Unsubscribed from updates')
            } catch {
              toast.error('Could not update email preferences')
              setMarketingOptIn(!checked)
            }
          }}
        />
      </div>

      <div id='resume' className='bg-white font-sans text-slate-900'>
        <ReadCvResumePreview
          data={draft}
          mode={editing ? 'edit' : 'view'}
          onDraftChange={editing ? setDraft : undefined}
          userEmail={userEmail}
          headerAvatarAction={profilePhotoUploadButton}
        />
      </div>
    </div>
  )
}
