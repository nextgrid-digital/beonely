import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEventHandler,
} from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { jobListingIsLive } from '@/lib/jobs/job-listing-live'
import { jobListingPreviewDataFromJob } from '@/lib/jobs/job-listing-preview-data'
import {
  formatListingLiveUntil,
  jobListingCanRenew,
} from '@/lib/jobs/job-listing-renewal'
import { recruiterOwnsJob } from '@/lib/jobs/recruiter-owned-job'
import {
  formatSalaryRange,
  parseSalaryRange,
} from '@/lib/jobs/salary-range-format'
import {
  plainTextFromJobDescription,
  sanitizeJobDescriptionHtml,
} from '@/lib/jobs/sanitize-job-description-html'
import {
  filterToKnownTaxonomy,
  SERVICENOW_JOB_CERTIFICATIONS,
  SERVICENOW_JOB_MODULES,
  SERVICENOW_JOB_SKILLS,
} from '@/lib/jobs/servicenow-job-taxonomy'
import { buildJobSlug } from '@/lib/jobs/slug'
import {
  uploadJobCompanyLogo,
  validateJobCompanyLogoFile,
} from '@/lib/jobs/upload-job-company-logo'
import {
  getSupabaseBrowserClient,
  getSupabaseConfigured,
} from '@/lib/supabase/client'
import type { JobRow, RecruiterRow } from '@/lib/supabase/database.types'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/auth-provider'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { JobListingPreview } from '@/features/jobs/job-listing-preview'
import { ExtendListingButton } from '@/features/recruiter/extend-listing-button'
import { JobListingInlineEditor } from '@/features/recruiter/job-listing-inline-editor'
import { JobShareMenu } from '@/features/recruiter/job-share-menu'
import { useRecruiterChromeActions } from '@/features/recruiter/recruiter-chrome-actions-context'

export const RECRUITER_JOB_EDITOR_FORM_ID = 'recruiter-job-editor-form'

export const jobEditorSchema = z.object({
  title: z.string().min(2),
  company: z.string().min(2),
  company_logo: z.string().optional(),
  description: z
    .string()
    .refine((s) => plainTextFromJobDescription(s).length >= 10, {
      message: 'Description must be at least 10 characters of text.',
    }),
  location: z.string().min(1),
  salary_currency: z.string().min(1),
  salary_amount: z.string().optional(),
  employment_type: z.string().min(1),
  experience_level: z.string().optional(),
  work_mode: z.string().optional(),
  job_type: z.string().optional(),
  modules: z.array(z.string()),
  certifications: z.array(z.string()),
  skills: z.array(z.string()),
})

export type JobEditorValues = z.infer<typeof jobEditorSchema>

/** Public job page URL for `apply_url` when the form does not collect it. */
export function applyUrlForJobSlug(jobSlug: string): string {
  const base = (
    import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined
  )?.trim()
  const origin = base?.replace(/\/$/, '') ?? window.location.origin
  return `${origin}/jobs/${jobSlug}`
}

export function defaultFormValues(job: JobRow | null): JobEditorValues {
  const salary = parseSalaryRange(job?.salary_range)
  return {
    title: job?.job_title ?? '',
    company: job?.company_name ?? '',
    company_logo: job?.company_logo ?? '',
    description: job?.job_description ?? '',
    location: job?.location ?? '',
    salary_currency: salary.currency,
    salary_amount: salary.amount,
    employment_type: job?.employment_type ?? 'full_time',
    experience_level: job?.experience_level ?? 'mid',
    work_mode: job?.work_mode ?? 'remote',
    job_type: job?.job_type ?? 'developer',
    modules: filterToKnownTaxonomy(job?.modules ?? [], SERVICENOW_JOB_MODULES),
    certifications: filterToKnownTaxonomy(
      job?.certifications ?? [],
      SERVICENOW_JOB_CERTIFICATIONS
    ),
    skills: filterToKnownTaxonomy(job?.skills ?? [], SERVICENOW_JOB_SKILLS),
  }
}

function companyLogoForSave(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

const CHROME_BTN = 'h-7 rounded-md px-2.5 text-xs font-medium'

export function RecruiterJobEditorPage(props: {
  recruiter: RecruiterRow
  job: JobRow | null
  embedded?: boolean
}) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { session } = useAuth()
  const logoInputRef = useRef<HTMLInputElement>(null)
  const jobDraftKey = props.job?.id ?? 'new'
  const [pendingLogoState, setPendingLogoState] = useState<{
    jobDraftKey: string
    file: File | null
  }>({ jobDraftKey, file: null })
  const pendingLogoFile =
    pendingLogoState.jobDraftKey === jobDraftKey ? pendingLogoState.file : null
  const setPendingLogoFile = (file: File | null) => {
    setPendingLogoState({ jobDraftKey, file })
  }
  const [logoBusy, setLogoBusy] = useState(false)
  const [editing, setEditing] = useState(false)
  const form = useForm<JobEditorValues>({
    resolver: zodResolver(jobEditorSchema),
    defaultValues: defaultFormValues(props.job),
  })
  const formRef = useRef(form)

  useEffect(() => {
    formRef.current = form
  }, [form])

  useEffect(() => {
    if (props.job && !recruiterOwnsJob(props.job, props.recruiter.id)) {
      void navigate({ to: '/recruiter', replace: true })
    }
  }, [props.job, props.recruiter.id, navigate])

  useEffect(() => {
    form.reset(defaultFormValues(props.job))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when saved job changes only
  }, [props.job])

  const isNewJob = !props.job
  const submitLabel = isNewJob ? 'Save draft' : 'Save changes'

  const save = useMutation({
    mutationFn: async (values: JobEditorValues) => {
      const sb = getSupabaseBrowserClient()
      const idSuffix = crypto.randomUUID()
      const job_slug = buildJobSlug(values.title, values.location, idSuffix)
      const expLevel = (values.experience_level ||
        'mid') as JobRow['experience_level']
      const workMode = (values.work_mode || 'remote') as JobRow['work_mode']
      const jobType = (values.job_type || 'developer') as JobRow['job_type']
      const empType = values.employment_type as JobRow['employment_type']
      const applyUrl = props.job
        ? props.job.apply_url
        : applyUrlForJobSlug(job_slug)
      const logoFromForm = companyLogoForSave(values.company_logo)
      const taxonomyPayload = {
        modules: values.modules,
        certifications: values.certifications,
        skills: values.skills,
        salary_range: formatSalaryRange(
          values.salary_currency,
          values.salary_amount
        ),
      }

      if (props.job) {
        const { error } = await sb
          .from('jobs')
          .update({
            job_title: values.title,
            company_name: values.company,
            company_logo: logoFromForm,
            job_description: sanitizeJobDescriptionHtml(values.description),
            location: values.location,
            apply_url: applyUrl,
            employment_type: empType,
            experience_level: expLevel,
            work_mode: workMode,
            job_type: jobType,
            ...taxonomyPayload,
          })
          .eq('id', props.job.id)
        if (error) throw error
        return {
          kind: 'update' as const,
          jobId: props.job.id,
          jobSlug: props.job.job_slug,
        }
      }

      const { data: inserted, error } = await sb
        .from('jobs')
        .insert({
          recruiter_id: props.recruiter.id,
          job_slug,
          job_title: values.title,
          company_name: values.company,
          company_logo: pendingLogoFile ? null : logoFromForm,
          job_description: sanitizeJobDescriptionHtml(values.description),
          location: values.location,
          apply_url: applyUrl,
          employment_type: empType,
          experience_level: expLevel,
          work_mode: workMode,
          job_type: jobType,
          approval_status: 'pending',
          payment_status: 'unpaid',
          listing_duration: 'monthly',
          listing_tier: 'standard',
          featured: false,
          source_kind: 'recruiter_posted',
          recruiter_email: props.recruiter.email,
          recruiter_name: props.recruiter.name,
          ...taxonomyPayload,
        })
        .select('id, job_slug')
        .single()
      if (error) throw error
      if (!inserted) throw new Error('Job was not created')

      if (pendingLogoFile) {
        const logoUrl = await uploadJobCompanyLogo(
          sb,
          props.recruiter.id,
          inserted.id,
          pendingLogoFile
        )
        const { error: logoError } = await sb
          .from('jobs')
          .update({ company_logo: logoUrl })
          .eq('id', inserted.id)
        if (logoError) throw logoError
      }

      return {
        kind: 'create' as const,
        jobId: inserted.id,
        jobSlug: inserted.job_slug,
      }
    },
    onSuccess: (result) => {
      toast.success('Job saved')
      void qc.invalidateQueries({ queryKey: ['recruiter-jobs'] })
      void qc.invalidateQueries({ queryKey: ['public-jobs'] })
      if (result?.jobId) {
        void qc.invalidateQueries({ queryKey: ['recruiter-job', result.jobId] })
      }
      if (result?.jobSlug) {
        void qc.invalidateQueries({ queryKey: ['job', result.jobSlug] })
      }

      if (result?.kind === 'create') {
        void navigate({
          to: '/recruiter/jobs/$jobId/edit',
          params: { jobId: result.jobId },
          replace: true,
        })
        return
      }

      setEditing(false)
    },
    onError: () => toast.error('Save failed'),
  })

  const onLogoFileChange: ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!getSupabaseConfigured()) {
      toast.error('Connect Supabase to upload a logo.')
      return
    }
    const validation = validateJobCompanyLogoFile(file)
    if (validation) {
      toast.error(validation)
      return
    }

    if (!props.job) {
      setPendingLogoFile(file)
      form.setValue('company_logo', URL.createObjectURL(file), {
        shouldDirty: true,
      })
      toast.success('Logo added. Save the job to upload it.')
      return
    }

    setLogoBusy(true)
    try {
      const sb = getSupabaseBrowserClient()
      const url = await uploadJobCompanyLogo(
        sb,
        props.recruiter.id,
        props.job.id,
        file
      )
      form.setValue('company_logo', url, { shouldDirty: true })
      toast.success('Logo uploaded. Save changes to keep other edits.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not upload logo')
    } finally {
      setLogoBusy(false)
    }
  }

  const clearLogo = () => {
    setPendingLogoFile(null)
    form.setValue('company_logo', '', { shouldDirty: true })
  }

  const savePending = save.isPending
  const saveMutate = save.mutate
  const jobIsLive = props.job ? jobListingIsLive(props.job) : false
  const jobCanRenew = props.job ? jobListingCanRenew(props.job) : false
  const liveUntilLabel = props.job ? formatListingLiveUntil(props.job) : null

  const chromeActions = useMemo(() => {
    if (editing) {
      return (
        <Button
          type='button'
          className={cn(CHROME_BTN, 'shadow-xs')}
          disabled={savePending}
          onClick={() => {
            void formRef.current.handleSubmit((v) => saveMutate(v))()
          }}
        >
          {savePending ? 'Saving…' : submitLabel}
        </Button>
      )
    }
    return (
      <div className='flex items-center gap-2'>
        {props.job && jobIsLive ? (
          <JobShareMenu job={props.job} buttonClassName={CHROME_BTN} />
        ) : null}
        {props.job && jobCanRenew ? (
          <ExtendListingButton
            job={props.job}
            accessToken={session?.access_token}
            buttonClassName={CHROME_BTN}
            compact
          />
        ) : null}
        <Button
          type='button'
          variant='outline'
          className={CHROME_BTN}
          onClick={() => {
            formRef.current.reset(defaultFormValues(props.job))
            // Defer so the Edit click does not land on the Save control that replaces it.
            window.setTimeout(() => setEditing(true), 0)
          }}
        >
          Edit
        </Button>
      </div>
    )
  }, [
    editing,
    jobCanRenew,
    jobIsLive,
    props.job,
    saveMutate,
    savePending,
    session?.access_token,
    submitLabel,
  ])

  useRecruiterChromeActions(chromeActions)

  if (!getSupabaseConfigured()) {
    return (
      <p className='text-sm text-muted-foreground'>
        Connect Supabase to manage listings.
      </p>
    )
  }

  const heading = props.job ? 'Edit job' : 'New job'
  const helperText = isNewJob
    ? 'Save as a draft, then pay from My jobs when you are ready to submit.'
    : 'Updates publish immediately on live listings.'
  const showPageHeading = !props.embedded
  const containerClass = 'w-full min-w-0 max-w-3xl space-y-6 pb-6'
  const previewData = jobListingPreviewDataFromJob(props.job)

  return (
    <div className={containerClass}>
      {showPageHeading ? (
        <div className='space-y-1'>
          <h1 className='text-lg font-semibold tracking-tight'>{heading}</h1>
          {liveUntilLabel &&
          props.job?.approval_status === 'approved' &&
          props.job?.payment_status === 'paid' ? (
            <p className='text-sm text-muted-foreground'>
              {jobIsLive
                ? `Live until ${liveUntilLabel}`
                : `Listing expired ${liveUntilLabel}`}
              {jobCanRenew ? ' — extend from the actions above.' : null}
            </p>
          ) : editing ? (
            <p className='text-sm text-muted-foreground'>{helperText}</p>
          ) : null}
        </div>
      ) : editing ? (
        <p className='text-sm text-muted-foreground'>{helperText}</p>
      ) : null}

      {editing ? (
        <Form {...form}>
          <form
            id={RECRUITER_JOB_EDITOR_FORM_ID}
            onSubmit={form.handleSubmit((v) => save.mutate(v))}
            className='grid min-w-0 gap-6'
          >
            <JobListingInlineEditor
              form={form}
              logoInputRef={logoInputRef}
              onLogoFileChange={onLogoFileChange}
              clearLogo={clearLogo}
              logoBusy={logoBusy}
              hasPendingLogo={Boolean(pendingLogoFile)}
            />
          </form>
        </Form>
      ) : (
        <JobListingPreview
          data={previewData}
          variant='public'
          showBanner={false}
        />
      )}
    </div>
  )
}
