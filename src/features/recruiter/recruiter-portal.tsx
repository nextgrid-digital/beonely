import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Loader2, Plus, Briefcase } from 'lucide-react'
import { toast } from 'sonner'
import { dispatchLifecycleEmail } from '@/lib/email/admin-email-api'
import { updateMarketingConsent } from '@/lib/email/marketing-opt-in'
import { formatQueryError } from '@/lib/format-query-error'
import { jobListingIsLive } from '@/lib/jobs/job-listing-live'
import { jobListingCanRenew } from '@/lib/jobs/job-listing-renewal'
import { RECRUITER_OWNED_JOB_SOURCE } from '@/lib/jobs/recruiter-owned-job'
import {
  paymentPlanFromSelection,
  type PaymentPlan,
} from '@/lib/payments/plans'
import { startRazorpayJobCheckout } from '@/lib/payments/razorpay-job-checkout'
import {
  getSupabaseBrowserClient,
  getSupabaseConfigured,
} from '@/lib/supabase/client'
import type { JobRow, RecruiterRow } from '@/lib/supabase/database.types'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/auth-provider'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { InboxList } from '@/components/inbox/inbox-list'
import type { InboxRowData } from '@/components/inbox/inbox-list-row'
import type { InboxPillItem } from '@/components/inbox/inbox-status-pill'
import { ExtendListingButton } from '@/features/recruiter/extend-listing-button'
import { JobShareMenu } from '@/features/recruiter/job-share-menu'
import { RecruiterJobPeek } from '@/features/recruiter/recruiter-job-peek'
import {
  ListingPlanCheckout,
  selectedPlanPriceLabel,
} from '@/features/recruiter/listing-plan-checkout'
import { FeaturedBoostPlanList } from '@/features/recruiter/plan-option-list'

const companySchema = z.object({
  company_name: z.string().min(2, 'Company name is required'),
})

type RecruiterJobsPayload = {
  jobs: JobRow[]
  /** Count of in-app `applications` rows per job id. */
  applicationCounts: Record<string, number>
}

type RecruiterJobsTab = 'all' | 'live' | 'pending' | 'unpaid'

function jobListingState(job: JobRow) {
  const canPay =
    job.approval_status === 'pending' && job.payment_status === 'unpaid'
  const isLive = jobListingIsLive(job)
  const canRenew = jobListingCanRenew(job)
  return { canPay, isLive, canRenew }
}

/** Right-aligned status pills for a recruiter's own listing (approval, payment, featured). */
function recruiterJobPills(job: JobRow): InboxPillItem[] {
  const pills: InboxPillItem[] = []
  switch (job.approval_status) {
    case 'approved':
      pills.push({ label: 'Approved', variant: 'success' })
      break
    case 'rejected':
      pills.push({ label: 'Rejected', variant: 'danger' })
      break
    case 'pending':
    default:
      pills.push({ label: 'Pending', variant: 'attention' })
      break
  }
  if (job.payment_status === 'unpaid') {
    pills.push({ label: 'Unpaid', variant: 'attention' })
  } else if (job.featured) {
    pills.push({ label: 'Featured', variant: 'success' })
  }
  return pills.slice(0, 2)
}

function jobMatchesRecruiterTab(job: JobRow, tab: RecruiterJobsTab): boolean {
  switch (tab) {
    case 'all':
      return true
    case 'live':
      return jobListingIsLive(job)
    case 'pending':
      return job.approval_status === 'pending'
    case 'unpaid':
      return job.payment_status === 'unpaid'
    default: {
      const _exhaustive: never = tab
      return _exhaustive
    }
  }
}

function RecruiterJobRowActions({
  job,
  canPay,
  isLive,
  canRenew,
  accessToken,
  compact = false,
  className,
}: {
  job: JobRow
  canPay: boolean
  isLive: boolean
  canRenew: boolean
  accessToken: string | undefined
  compact?: boolean
  className?: string
}) {
  const btnClass = compact
    ? 'h-8 shrink-0 px-2.5 text-xs'
    : 'min-h-11 shrink-0 justify-center px-3'

  return (
    <div
      className={cn(
        'flex flex-nowrap items-center gap-1.5',
        !compact && '-mx-1 overflow-x-auto px-1',
        className
      )}
    >
      {isLive ? (
        <>
          <Button variant='outline' size='sm' asChild className={btnClass}>
            <Link
              to='/jobs/$slug'
              params={{ slug: job.job_slug }}
              target='_blank'
            >
              View
            </Link>
          </Button>
          <JobShareMenu job={job} buttonClassName={btnClass} />
        </>
      ) : (
        <Button
          variant='outline'
          size='sm'
          className={btnClass}
          disabled
          title='Live after approval'
        >
          View
        </Button>
      )}
      {canRenew ? (
        <ExtendListingButton
          job={job}
          accessToken={accessToken}
          compact={compact}
          buttonClassName={btnClass}
        />
      ) : null}
      {isLive ? (
        <FeaturedBoostButton
          job={job}
          accessToken={accessToken}
          compact={compact}
          buttonClassName={btnClass}
        />
      ) : null}
      <Button variant='outline' size='sm' asChild className={btnClass}>
        <Link to='/recruiter/jobs/$jobId/edit' params={{ jobId: job.id }}>
          Edit
        </Link>
      </Button>
      {canPay ? (
        <PayJobButton
          job={job}
          accessToken={accessToken}
          buttonClassName={btnClass}
          label={compact ? 'Pay' : undefined}
        />
      ) : null}
    </div>
  )
}

export function RecruiterPortal() {
  const { user, session } = useAuth()
  const qc = useQueryClient()
  const [peekJob, setPeekJob] = useState<JobRow | null>(null)
  const [tab, setTab] = useState<RecruiterJobsTab>('all')
  const [searchQuery, setSearchQuery] = useState('')

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

  const jobsQuery = useQuery({
    queryKey: ['recruiter-jobs', recruiterQuery.data?.id],
    enabled: Boolean(recruiterQuery.data?.id),
    queryFn: async (): Promise<RecruiterJobsPayload> => {
      const sb = getSupabaseBrowserClient()
      const recruiterId = recruiterQuery.data!.id
      const { data, error } = await sb
        .from('jobs')
        .select('*')
        .eq('recruiter_id', recruiterId)
        .eq('source_kind', RECRUITER_OWNED_JOB_SOURCE)
        .order('created_at', { ascending: false })
      if (error) throw error
      const jobs = (data ?? []) as JobRow[]
      const applicationCounts: Record<string, number> = Object.fromEntries(
        jobs.map((j) => [j.id, 0])
      )
      if (jobs.length === 0) {
        return { jobs, applicationCounts }
      }
      const jobIds = jobs.map((j) => j.id)
      const { data: appRows, error: appError } = await sb
        .from('applications')
        .select('job_id')
        .in('job_id', jobIds)
      if (appError) throw appError
      for (const row of appRows ?? []) {
        const jid = row.job_id as string
        applicationCounts[jid] = (applicationCounts[jid] ?? 0) + 1
      }
      return { jobs, applicationCounts }
    },
  })

  const createRecruiter = useMutation({
    mutationFn: async (company_name: string) => {
      const sb = getSupabaseBrowserClient()
      const u = user!
      const displayName =
        (u.user_metadata?.full_name as string | undefined)?.trim() ||
        u.email?.split('@')[0] ||
        company_name
      const now = new Date().toISOString()
      const { error } = await sb.from('recruiters').insert({
        user_id: u.id,
        company_name,
        email: u.email ?? '',
        name: displayName,
        role: 'recruiter',
        marketing_opt_in: true,
        marketing_opt_in_at: now,
      })
      if (error) throw error
    },
    onSuccess: async (_data, company_name) => {
      void qc.invalidateQueries({ queryKey: ['recruiter', user?.id] })
      toast.success('Recruiter profile created')
      const token = (await getSupabaseBrowserClient().auth.getSession()).data
        .session?.access_token
      if (token && user?.id) {
        void dispatchLifecycleEmail(token, {
          trigger_key: 'recruiter_signup',
          payload: { company_name },
          dedupe_key: `recruiter_signup:${user.id}`,
        }).catch(() => undefined)
        void updateMarketingConsent({
          marketing_opt_in: true,
          audience: 'recruiter',
          accessToken: token,
        }).catch(() => undefined)
      }
    },
    onError: () => toast.error('Could not create recruiter profile'),
  })

  const companyForm = useForm<z.infer<typeof companySchema>>({
    resolver: zodResolver(companySchema),
    defaultValues: { company_name: '' },
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
      <div className='max-w-md space-y-4'>
        <h2 className='text-lg font-medium'>Company details</h2>
        <p className='text-sm text-muted-foreground'>
          Tell us who is hiring so you can publish paid ServiceNow listings.
        </p>
        <Form {...companyForm}>
          <form
            onSubmit={companyForm.handleSubmit((v) =>
              createRecruiter.mutate(v.company_name)
            )}
            className='space-y-4'
          >
            <FormField
              control={companyForm.control}
              name='company_name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type='submit' disabled={createRecruiter.isPending}>
              Continue
            </Button>
          </form>
        </Form>
      </div>
    )
  }

  const recruiter = recruiterQuery.data
  if (!recruiter) {
    return null
  }

  const jobs = jobsQuery.data?.jobs ?? []
  const applicationCounts = jobsQuery.data?.applicationCounts ?? {}
  const showEmptyJobs =
    !jobsQuery.isLoading && jobsQuery.isSuccess && jobs.length === 0

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const recruiterRows: InboxRowData[] = jobs
    .filter((job) => jobMatchesRecruiterTab(job, tab))
    .filter((job) =>
      normalizedQuery
        ? (job.job_title ?? '').toLowerCase().includes(normalizedQuery)
        : true
    )
    .map((job) => {
      const applicantCount = applicationCounts[job.id] ?? 0
      return {
        id: job.id,
        title: job.job_title?.trim() || 'Untitled job',
        preview: `${applicantCount} applicant${applicantCount === 1 ? '' : 's'}`,
        pills: recruiterJobPills(job),
        timestamp: job.created_at ?? undefined,
      }
    })

  const recruiterTabPills = [
    { id: 'all' as const, label: 'All', count: jobs.length },
    {
      id: 'live' as const,
      label: 'Live',
      count: jobs.filter((j) => jobListingIsLive(j)).length,
    },
    {
      id: 'pending' as const,
      label: 'Pending',
      count: jobs.filter((j) => j.approval_status === 'pending').length,
    },
    {
      id: 'unpaid' as const,
      label: 'Unpaid',
      count: jobs.filter((j) => j.payment_status === 'unpaid').length,
    },
  ]

  return (
    <div className='space-y-6'>
      {jobsQuery.isError ? (
        <div className='space-y-4'>
          <Alert variant='destructive'>
            <AlertTitle>Could not load your jobs</AlertTitle>
            <AlertDescription>
              {formatQueryError(
                jobsQuery.error,
                'Something went wrong while loading listings.'
              )}
            </AlertDescription>
          </Alert>
          <Button
            type='button'
            variant='outline'
            onClick={() => void jobsQuery.refetch()}
          >
            Try again
          </Button>
        </div>
      ) : null}
      {!jobsQuery.isError && showEmptyJobs ? (
        <Card className='border-dashed bg-muted/30'>
          <CardContent className='flex flex-col items-center gap-4 py-12 text-center'>
            <Briefcase className='size-12 text-muted-foreground' aria-hidden />
            <div className='space-y-1'>
              <p className='text-base font-medium text-foreground'>
                No jobs yet
              </p>
              <p className='text-sm text-muted-foreground'>
                Create a draft listing, then pay with Razorpay and wait for
                moderation before it appears on public job search.
              </p>
            </div>
            <Button asChild size='default'>
              <Link to='/recruiter/jobs/new'>
                <Plus className='me-1 size-4' aria-hidden />
                New job
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : !jobsQuery.isError ? (
        <InboxList<RecruiterJobsTab>
          className='h-auto'
          title='My jobs'
          titleActions={
            <Button asChild size='sm'>
              <Link to='/recruiter/jobs/new'>
                <Plus className='me-1 size-4' aria-hidden />
                New job
              </Link>
            </Button>
          }
          search={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder='Search your jobs...'
          pills={recruiterTabPills}
          activeFilter={tab}
          onFilterChange={setTab}
          layoutId='recruiter-jobs'
          rows={recruiterRows}
          selectedId={peekJob?.id ?? null}
          onSelect={(id) => {
            const next = jobs.find((j) => j.id === id) ?? null
            setPeekJob(next)
          }}
          loading={jobsQuery.isLoading}
          emptyMessage='No jobs match this view.'
        />
      ) : null}

      <RecruiterJobPeek
        job={peekJob}
        open={Boolean(peekJob)}
        onOpenChange={(open) => {
          if (!open) setPeekJob(null)
        }}
        applicantCount={peekJob ? (applicationCounts[peekJob.id] ?? 0) : 0}
        actions={
          peekJob
            ? (() => {
                const { canPay, isLive, canRenew } = jobListingState(peekJob)
                return (
                  <RecruiterJobRowActions
                    job={peekJob}
                    canPay={canPay}
                    isLive={isLive}
                    canRenew={canRenew}
                    accessToken={session?.access_token}
                  />
                )
              })()
            : null
        }
      />
    </div>
  )
}

function PayJobButton(props: {
  job: JobRow
  accessToken: string | undefined
  buttonClassName?: string
  label?: string
}) {
  const [planOpen, setPlanOpen] = useState(false)
  const [plan, setPlan] = useState<PaymentPlan>(
    paymentPlanFromSelection('month', false, false)
  )
  const [paying, setPaying] = useState(false)

  const startPay = async () => {
    if (!props.accessToken) {
      toast.error('Sign in again')
      return
    }
    setPaying(true)
    try {
      await startRazorpayJobCheckout({
        jobId: props.job.id,
        plan,
        accessToken: props.accessToken,
        onPaid: () => {
          toast.success('Payment successful — pending review')
          setPlanOpen(false)
          window.location.reload()
        },
        onError: (m) => toast.error(m),
        prepareRazorpayUi: async () => {
          setPlanOpen(false)
          await new Promise((r) => setTimeout(r, 150))
        },
      })
    } finally {
      setPaying(false)
    }
  }

  return (
    <>
      <Button
        size='sm'
        variant='secondary'
        className={cn(props.buttonClassName ?? 'min-h-11 md:min-h-8')}
        onClick={() => setPlanOpen(true)}
      >
        {props.label ?? 'Pay & submit'}
      </Button>
      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Choose plan</DialogTitle>
            <DialogDescription>
              Pick how long this listing stays live. Payment is required before
              moderation review.
            </DialogDescription>
          </DialogHeader>
          <ListingPlanCheckout plan={plan} onChange={setPlan} />
          <DialogFooter className='flex-col gap-2 sm:flex-col sm:items-stretch'>
            <p className='text-center text-sm text-muted-foreground'>
              Total due:{' '}
              <span className='font-semibold text-foreground tabular-nums'>
                {selectedPlanPriceLabel(plan)}
              </span>
            </p>
            <Button disabled={paying} onClick={() => void startPay()}>
              {paying ? (
                <>
                  <Loader2 className='size-4 animate-spin' aria-hidden />
                  Starting checkout…
                </>
              ) : (
                `Pay ${selectedPlanPriceLabel(plan)} with Razorpay`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function FeaturedBoostButton(props: {
  job: JobRow
  accessToken: string | undefined
  buttonClassName?: string
  compact?: boolean
}) {
  const [planOpen, setPlanOpen] = useState(false)
  const [plan, setPlan] = useState<PaymentPlan>('featured_month')
  const [paying, setPaying] = useState(false)

  const startPay = async () => {
    if (!props.accessToken) {
      toast.error('Sign in again')
      return
    }
    setPaying(true)
    try {
      await startRazorpayJobCheckout({
        jobId: props.job.id,
        plan,
        accessToken: props.accessToken,
        onPaid: () => {
          toast.success(
            props.job.featured
              ? 'Featured window extended'
              : 'Listing upgraded to Featured'
          )
          setPlanOpen(false)
          window.location.reload()
        },
        onError: (m) => toast.error(m),
        prepareRazorpayUi: async () => {
          setPlanOpen(false)
          await new Promise((r) => setTimeout(r, 150))
        },
      })
    } finally {
      setPaying(false)
    }
  }

  return (
    <>
      <Button
        size='sm'
        variant='default'
        className={cn(props.buttonClassName ?? 'min-h-11 md:min-h-8')}
        onClick={() => setPlanOpen(true)}
      >
        {props.compact
          ? props.job.featured
            ? 'Extend'
            : 'Feature'
          : props.job.featured
            ? 'Extend featured'
            : 'Upgrade to Featured'}
      </Button>
      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Featured boost</DialogTitle>
            <DialogDescription>
              Applies to this live listing: extends visibility and sets the
              Featured badge after payment.
            </DialogDescription>
          </DialogHeader>
          <FeaturedBoostPlanList
            name='boost-plan'
            value={plan}
            onChange={setPlan}
          />
          <DialogFooter className='flex-col gap-2 sm:flex-col sm:items-stretch'>
            <p className='text-center text-sm text-muted-foreground'>
              Total due:{' '}
              <span className='font-semibold text-foreground tabular-nums'>
                {selectedPlanPriceLabel(plan)}
              </span>
            </p>
            <Button disabled={paying} onClick={() => void startPay()}>
              {paying ? (
                <>
                  <Loader2 className='size-4 animate-spin' aria-hidden />
                  Starting checkout…
                </>
              ) : (
                `Pay ${selectedPlanPriceLabel(plan)} with Razorpay`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
