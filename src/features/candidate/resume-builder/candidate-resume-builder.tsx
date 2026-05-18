/**
 * Candidate profile completion editor (read.cv-style preview).
 * Sign-up supplies LinkedIn + phone on `job_seeker_profiles`; this UI collects the rest.
 */
import { useId, useState, type ChangeEventHandler } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ChevronRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { persistCandidateProfileDraft } from '@/lib/candidate/persist-candidate-profile-draft'
import {
  type AccountResumePrefill,
  prefillResumeFromProfile,
  shouldPrefillResumeFromAccount,
} from '@/lib/candidate/resume-prefill'
import {
  parseResumeStructured,
  type ResumeStructuredV1,
} from '@/lib/candidate/resume-structured-schema'
import {
  uploadCandidateAvatar,
  validateCandidateAvatarFile,
} from '@/lib/candidate/upload-candidate-avatar'
import {
  getSupabaseBrowserClient,
  getSupabaseConfigured,
} from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
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
  const avatarInputId = useId()
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

  const invalidateProfileQueries = () => {
    void qc.invalidateQueries({ queryKey: ['job-seeker-profile', userId] })
    void qc.invalidateQueries({
      queryKey: ['job-seeker-profile-completion', userId],
    })
  }

  const saveResume = useMutation({
    mutationFn: async () => {
      const sb = getSupabaseBrowserClient()
      await persistCandidateProfileDraft(sb, {
        draft,
        userId,
        userEmail,
        profileRow,
      })
    },
    onSuccess: () => {
      invalidateProfileQueries()
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
      const nextDraft: ResumeStructuredV1 = {
        ...draft,
        general: { ...draft.general, avatar: url },
      }
      setDraft(nextDraft)
      try {
        await persistCandidateProfileDraft(sb, {
          draft: nextDraft,
          userId,
          userEmail,
          profileRow,
        })
        invalidateProfileQueries()
        toast.success('Profile photo updated')
      } catch (persistErr) {
        toast.error(
          persistErr instanceof Error
            ? persistErr.message
            : 'Photo uploaded but could not save to your profile'
        )
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not upload photo')
    } finally {
      setAvatarBusy(false)
    }
  }

  const profilePhotoUploadLabel = (
    <span
      className='inline-flex items-center justify-center rounded-md border-0 bg-white/95 px-2 py-1 text-[10px] font-medium text-slate-900 shadow-sm sm:text-xs'
      aria-hidden={avatarBusy}
    >
      {avatarBusy ? (
        <Loader2 className='mx-auto size-4 animate-spin' aria-hidden />
      ) : null}
      {avatarBusy ? 'Uploading…' : 'Upload'}
    </span>
  )

  return (
    <div className='w-full pt-2'>
      <input
        id={avatarInputId}
        type='file'
        accept='image/jpeg,image/png,image/webp'
        className='sr-only'
        disabled={avatarBusy || !getSupabaseConfigured()}
        aria-label='Upload profile picture. JPEG, PNG, or WebP. Maximum 5 megabytes.'
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

      <div id='resume' className='bg-white font-sans text-slate-900'>
        <ReadCvResumePreview
          data={draft}
          mode={editing ? 'edit' : 'view'}
          onDraftChange={editing ? setDraft : undefined}
          userEmail={userEmail}
          headerAvatarInputId={editing ? avatarInputId : undefined}
          headerAvatarAction={editing ? profilePhotoUploadLabel : undefined}
        />
      </div>
    </div>
  )
}
