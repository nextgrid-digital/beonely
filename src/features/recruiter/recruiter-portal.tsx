import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Loader2, Plus, Briefcase } from 'lucide-react'
import { toast } from 'sonner'
import { PLAN_LABEL, type PaymentPlan } from '@/lib/payments/plans'
import { startRazorpayJobCheckout } from '@/lib/payments/razorpay-job-checkout'
import {
  getSupabaseBrowserClient,
  getSupabaseConfigured,
} from '@/lib/supabase/client'
import type { JobRow, RecruiterRow } from '@/lib/supabase/database.types'
import { useAuth } from '@/context/auth-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'

const companySchema = z.object({
  company_name: z.string().min(2, 'Company name is required'),
})

type RecruiterJobsPayload = {
  jobs: JobRow[]
  /** Count of in-app `applications` rows per job id. */
  applicationCounts: Record<string, number>
}

export function RecruiterPortal() {
  const { user, session } = useAuth()
  const qc = useQueryClient()

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
      const { error } = await sb.from('recruiters').insert({
        user_id: u.id,
        company_name,
        email: u.email ?? '',
        name: displayName,
        role: 'recruiter',
      })
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['recruiter', user?.id] })
      toast.success('Recruiter profile created')
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

  if (!recruiterQuery.data) {
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
  const showJobsSkeleton = jobsQuery.isLoading
  const showEmptyJobs =
    !jobsQuery.isLoading && jobsQuery.isSuccess && jobs.length === 0

  return (
    <div className='space-y-6'>
      {showJobsSkeleton ? (
        <RecruiterJobsTableSkeleton />
      ) : showEmptyJobs ? (
        <Card className='border-dashed bg-muted/30'>
          <CardContent className='flex flex-col items-center gap-4 py-12 text-center'>
            <Briefcase
              className='size-12 text-muted-foreground'
              aria-hidden
            />
            <div className='space-y-1'>
              <p className='text-base font-medium text-foreground'>No jobs yet</p>
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
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead className='w-[1%] whitespace-nowrap text-end tabular-nums'>
                Applicants
              </TableHead>
              <TableHead>Approval</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Featured</TableHead>
              <TableHead className='text-end'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => {
              const canEdit =
                job.approval_status === 'pending' &&
                job.payment_status === 'unpaid'
              const isLive =
                job.approval_status === 'approved' &&
                job.payment_status === 'paid' &&
                (!job.listing_expires_at ||
                  new Date(job.listing_expires_at) > new Date())
              return (
                <TableRow key={job.id}>
                  <TableCell>
                    <Button
                      variant='link'
                      className='h-auto p-0 font-medium'
                      asChild
                    >
                      <Link
                        to='/recruiter/jobs/$jobId/applicants'
                        params={{ jobId: job.id }}
                      >
                        {job.job_title?.trim() || 'Untitled job'}
                      </Link>
                    </Button>
                  </TableCell>
                  <TableCell className='text-end tabular-nums text-muted-foreground'>
                    {applicationCounts[job.id] ?? 0}
                  </TableCell>
                  <TableCell>
                    <Badge variant='outline'>{job.approval_status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant='outline'>{job.payment_status}</Badge>
                  </TableCell>
                  <TableCell>{job.featured ? 'Yes' : 'No'}</TableCell>
                  <TableCell className='text-end'>
                    <div className='flex flex-wrap justify-end gap-2'>
                      {isLive ? (
                        <Button variant='outline' size='sm' asChild>
                          <Link
                            to='/jobs/$slug'
                            params={{ slug: job.job_slug }}
                            target='_blank'
                          >
                            View
                          </Link>
                        </Button>
                      ) : (
                        <Button
                          variant='outline'
                          size='sm'
                          disabled
                          title='Live after approval'
                        >
                          View
                        </Button>
                      )}
                      {isLive && (
                        <FeaturedBoostButton
                          job={job}
                          accessToken={session?.access_token}
                        />
                      )}
                      {canEdit && (
                        <Button variant='outline' size='sm' asChild>
                          <Link
                            to='/recruiter/jobs/$jobId/edit'
                            params={{ jobId: job.id }}
                          >
                            Edit
                          </Link>
                        </Button>
                      )}
                      {canEdit && (
                        <PayJobButton
                          job={job}
                          accessToken={session?.access_token}
                        />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

function RecruiterJobsTableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead className='w-[1%] whitespace-nowrap text-end tabular-nums'>
            Applicants
          </TableHead>
          <TableHead>Approval</TableHead>
          <TableHead>Payment</TableHead>
          <TableHead>Featured</TableHead>
          <TableHead className='text-end'>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 5 }, (_, i) => (
          <TableRow key={i}>
            <TableCell>
              <Skeleton className='h-5 w-44' />
            </TableCell>
            <TableCell className='text-end'>
              <Skeleton className='ms-auto h-5 w-8' />
            </TableCell>
            <TableCell>
              <Skeleton className='h-5 w-20' />
            </TableCell>
            <TableCell>
              <Skeleton className='h-5 w-20' />
            </TableCell>
            <TableCell>
              <Skeleton className='h-5 w-10' />
            </TableCell>
            <TableCell className='text-end'>
              <Skeleton className='ms-auto h-8 w-24' />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function PayJobButton(props: { job: JobRow; accessToken: string | undefined }) {
  const [planOpen, setPlanOpen] = useState(false)
  const [plan, setPlan] = useState<PaymentPlan>('standard_week')
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
      <Button size='sm' variant='secondary' onClick={() => setPlanOpen(true)}>
        Pay & submit
      </Button>
      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose plan</DialogTitle>
          </DialogHeader>
          <div className='grid gap-2'>
            {(Object.keys(PLAN_LABEL) as PaymentPlan[]).map((p) => (
              <label
                key={p}
                className='flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm'
              >
                <input
                  type='radio'
                  name='plan'
                  checked={plan === p}
                  onChange={() => setPlan(p)}
                />
                {PLAN_LABEL[p]}
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button
              disabled={paying}
              onClick={() => void startPay()}
            >
              {paying ? (
                <>
                  <Loader2 className='size-4 animate-spin' aria-hidden />
                  Starting checkout…
                </>
              ) : (
                'Pay with Razorpay'
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
}) {
  const [planOpen, setPlanOpen] = useState(false)
  const [plan, setPlan] = useState<PaymentPlan>('featured_week')
  const featuredPlans: PaymentPlan[] = ['featured_week', 'featured_month']
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
      <Button size='sm' variant='default' onClick={() => setPlanOpen(true)}>
        {props.job.featured ? 'Extend featured' : 'Upgrade to Featured'}
      </Button>
      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Featured boost</DialogTitle>
          </DialogHeader>
          <p className='text-sm text-muted-foreground'>
            Applies to this live listing: extends visibility and sets the
            Featured badge after payment.
          </p>
          <div className='grid gap-2'>
            {featuredPlans.map((p) => (
              <label
                key={p}
                className='flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm'
              >
                <input
                  type='radio'
                  name='boost-plan'
                  checked={plan === p}
                  onChange={() => setPlan(p)}
                />
                {PLAN_LABEL[p]}
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button
              disabled={paying}
              onClick={() => void startPay()}
            >
              {paying ? (
                <>
                  <Loader2 className='size-4 animate-spin' aria-hidden />
                  Starting checkout…
                </>
              ) : (
                'Pay with Razorpay'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
