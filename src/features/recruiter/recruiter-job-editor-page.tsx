import { useEffect, useRef, useState, type ChangeEventHandler } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { companyInitials } from '@/features/jobs/company-logo-avatar'
import { JobDescriptionRichTextField } from '@/features/jobs/job-description-rich-text-field'
import {
  plainTextFromJobDescription,
  sanitizeJobDescriptionHtml,
} from '@/lib/jobs/sanitize-job-description-html'

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
  employment_type: z.string().min(1),
  experience_level: z.string().optional(),
  work_mode: z.string().optional(),
  job_type: z.string().optional(),
})

/** Public job page URL for `apply_url` when the form does not collect it. */
export function applyUrlForJobSlug(jobSlug: string): string {
  const base = (
    import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined
  )?.trim()
  const origin = base?.replace(/\/$/, '') ?? window.location.origin
  return `${origin}/jobs/${jobSlug}`
}

type JobEditorValues = z.infer<typeof jobEditorSchema>

function defaultFormValues(job: JobRow | null): JobEditorValues {
  return {
    title: job?.job_title ?? '',
    company: job?.company_name ?? '',
    company_logo: job?.company_logo ?? '',
    description: job?.job_description ?? '',
    location: job?.location ?? '',
    employment_type: job?.employment_type ?? 'full_time',
    experience_level: job?.experience_level ?? 'mid',
    work_mode: job?.work_mode ?? 'remote',
    job_type: job?.job_type ?? 'developer',
  }
}

function companyLogoForSave(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export function RecruiterJobEditorPage(props: {
  recruiter: RecruiterRow
  job: JobRow | null
}) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null)
  const [logoBusy, setLogoBusy] = useState(false)
  const form = useForm<JobEditorValues>({
    resolver: zodResolver(jobEditorSchema),
    defaultValues: defaultFormValues(props.job),
  })

  useEffect(() => {
    form.reset(defaultFormValues(props.job))
    setPendingLogoFile(null)
  }, [props.job, form])

  const companyName = form.watch('company')
  const companyLogo = form.watch('company_logo')

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
          })
          .eq('id', props.job.id)
        if (error) throw error
        return { jobId: props.job.id, jobSlug: props.job.job_slug }
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
          certifications: [],
          modules: [],
          skills: [],
          recruiter_email: props.recruiter.email,
          recruiter_name: props.recruiter.name,
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

      return { jobId: inserted.id, jobSlug: inserted.job_slug }
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
      void navigate({ to: '/recruiter' })
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

  if (!getSupabaseConfigured()) {
    return (
      <p className='text-sm text-muted-foreground'>
        Connect Supabase to manage listings.
      </p>
    )
  }

  const heading = props.job ? 'Edit job' : 'New job'
  const isNewJob = !props.job
  const helperText = isNewJob
    ? 'Save as a draft, then pay from My jobs when you are ready to submit.'
    : 'Updates publish immediately on live listings.'
  const submitLabel = isNewJob ? 'Save draft' : 'Save changes'
  const logoPreviewUrl = companyLogo?.trim() || undefined

  return (
    <div className='mx-auto w-full max-w-2xl space-y-6 pb-6'>
      <div className='space-y-1'>
        <h1 className='text-lg font-semibold tracking-tight'>{heading}</h1>
        <p className='text-sm text-muted-foreground'>{helperText}</p>
      </div>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((v) => save.mutate(v))}
          className='grid gap-3'
        >
          <FormField
            control={form.control}
            name='title'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='company'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormItem>
            <FormLabel>Company logo</FormLabel>
            <div className='flex flex-wrap items-center gap-3'>
              <Avatar className='size-14 rounded-md border border-border/60 bg-muted/30'>
                {logoPreviewUrl ? (
                  <AvatarImage
                    src={logoPreviewUrl}
                    alt={`${companyName || 'Company'} logo`}
                    className='object-cover'
                  />
                ) : null}
                <AvatarFallback className='rounded-md text-sm font-semibold uppercase'>
                  {companyInitials(companyName || 'Co')}
                </AvatarFallback>
              </Avatar>
              <div className='flex flex-wrap gap-2'>
                <input
                  ref={logoInputRef}
                  type='file'
                  accept='image/jpeg,image/png,image/webp'
                  className='sr-only'
                  onChange={onLogoFileChange}
                />
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  disabled={logoBusy}
                  onClick={() => logoInputRef.current?.click()}
                >
                  {logoBusy ? 'Uploading…' : 'Upload logo'}
                </Button>
                {(logoPreviewUrl || pendingLogoFile) && (
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    onClick={clearLogo}
                  >
                    Remove logo
                  </Button>
                )}
              </div>
            </div>
            <FormDescription className='mt-1.5'>
              JPEG, PNG, or WebP, up to 5 MB. Shown on the public job board.
            </FormDescription>
          </FormItem>
          <FormField
            control={form.control}
            name='location'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='description'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <JobDescriptionRichTextField
                    value={field.value}
                    onChange={field.onChange}
                    editable
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className='grid grid-cols-2 gap-2'>
            <FormField
              control={form.control}
              name='employment_type'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value='full_time'>Full-time</SelectItem>
                      <SelectItem value='part_time'>Part-time</SelectItem>
                      <SelectItem value='contract'>Contract</SelectItem>
                      <SelectItem value='freelance'>Freelance</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='job_type'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value='developer'>Developer</SelectItem>
                      <SelectItem value='architect'>Architect</SelectItem>
                      <SelectItem value='consultant'>Consultant</SelectItem>
                      <SelectItem value='admin'>Admin</SelectItem>
                      <SelectItem value='analyst'>Analyst</SelectItem>
                      <SelectItem value='manager'>Manager</SelectItem>
                      <SelectItem value='other'>Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className='grid grid-cols-2 gap-2'>
            <FormField
              control={form.control}
              name='experience_level'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Experience</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value='entry'>Entry</SelectItem>
                      <SelectItem value='mid'>Mid</SelectItem>
                      <SelectItem value='senior'>Senior</SelectItem>
                      <SelectItem value='lead'>Lead</SelectItem>
                      <SelectItem value='principal'>Principal</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='work_mode'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Work mode</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value='remote'>Remote</SelectItem>
                      <SelectItem value='hybrid'>Hybrid</SelectItem>
                      <SelectItem value='onsite'>On-site</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className='flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end'>
            <Button
              type='button'
              variant='ghost'
              onClick={() => void navigate({ to: '/recruiter' })}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={save.isPending}>
              {submitLabel}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
