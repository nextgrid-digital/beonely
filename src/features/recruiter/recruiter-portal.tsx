import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/context/auth-provider'
import { buildJobSlug } from '@/lib/jobs/slug'
import { PLAN_LABEL, type PaymentPlan } from '@/lib/payments/plans'
import { startRazorpayJobCheckout } from '@/lib/payments/razorpay-job-checkout'
import { getSupabaseBrowserClient, getSupabaseConfigured } from '@/lib/supabase/client'
import type { JobRow, RecruiterRow } from '@/lib/supabase/database.types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'

const companySchema = z.object({
  company_name: z.string().min(2, 'Company name is required'),
})

const jobSchema = z.object({
  title: z.string().min(2),
  company: z.string().min(2),
  description: z.string().min(10),
  location: z.string().min(1),
  apply_url: z.string().url(),
  employment_type: z.string().min(1),
  experience_level: z.string().optional(),
  work_mode: z.string().optional(),
  job_type: z.string().optional(),
})

export function RecruiterPortal () {
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
    queryFn: async () => {
      const sb = getSupabaseBrowserClient()
      const { data, error } = await sb
        .from('jobs')
        .select('*')
        .eq('recruiter_id', recruiterQuery.data!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as JobRow[]
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
            onSubmit={companyForm.handleSubmit((v) => createRecruiter.mutate(v.company_name))}
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

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h2 className='text-lg font-medium'>Your listings</h2>
          <p className='text-sm text-muted-foreground'>
            {recruiter.company_name} — draft, pay, then moderation.
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <Button variant='link' className='h-auto px-0 text-sm' asChild>
            <Link to='/recruiter/pricing'>Pricing &amp; plans</Link>
          </Button>
          <JobEditorDialog
            recruiter={recruiter}
            job={null}
            onSaved={() => void qc.invalidateQueries({ queryKey: ['recruiter-jobs'] })}
          />
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Approval</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead>Featured</TableHead>
            <TableHead className='text-end'>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(jobsQuery.data ?? []).map((job) => {
            const canEdit =
              job.approval_status === 'pending' && job.payment_status === 'unpaid'
            const isLive =
              job.approval_status === 'approved' &&
              job.payment_status === 'paid' &&
              (!job.listing_expires_at ||
                new Date(job.listing_expires_at) > new Date())
            return (
            <TableRow key={job.id}>
              <TableCell className='font-medium'>{job.job_title}</TableCell>
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
                    <Button variant='outline' size='sm' disabled title='Live after approval'>
                      View
                    </Button>
                  )}
                  {isLive && (
                    <FeaturedBoostButton job={job} accessToken={session?.access_token} />
                  )}
                  {canEdit && (
                    <JobEditorDialog
                      recruiter={recruiter}
                      job={job}
                      onSaved={() => void qc.invalidateQueries({ queryKey: ['recruiter-jobs'] })}
                    />
                  )}
                  {canEdit && (
                    <PayJobButton job={job} accessToken={session?.access_token} />
                  )}
                </div>
              </TableCell>
            </TableRow>
            )
          })}
        </TableBody>
      </Table>
      {jobsQuery.data?.length === 0 && (
        <p className='text-sm text-muted-foreground'>No jobs yet — create one.</p>
      )}
    </div>
  )
}

function JobEditorDialog (props: {
  recruiter: RecruiterRow
  job: JobRow | null
  onSaved: () => void
}) {
  const [open, setOpen] = useState(false)
  const form = useForm<z.infer<typeof jobSchema>>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      title: props.job?.job_title ?? '',
      company: props.job?.company_name ?? '',
      description: props.job?.job_description ?? '',
      location: props.job?.location ?? '',
      apply_url: props.job?.apply_url ?? 'https://',
      employment_type: props.job?.employment_type ?? 'full_time',
      experience_level: props.job?.experience_level ?? 'mid',
      work_mode: props.job?.work_mode ?? 'remote',
      job_type: props.job?.job_type ?? 'developer',
    },
  })

  useEffect(() => {
    if (props.job) {
      form.reset({
        title: props.job.job_title,
        company: props.job.company_name,
        description: props.job.job_description,
        location: props.job.location,
        apply_url: props.job.apply_url,
        employment_type: props.job.employment_type,
        experience_level: props.job.experience_level ?? 'mid',
        work_mode: props.job.work_mode ?? 'remote',
        job_type: props.job.job_type ?? 'developer',
      })
    }
  }, [props.job, form])

  const save = useMutation({
    mutationFn: async (values: z.infer<typeof jobSchema>) => {
      const sb = getSupabaseBrowserClient()
      const idSuffix = crypto.randomUUID()
      const job_slug = buildJobSlug(values.title, values.location, idSuffix)
      const expLevel = (values.experience_level || 'mid') as JobRow['experience_level']
      const workMode = (values.work_mode || 'remote') as JobRow['work_mode']
      const jobType = (values.job_type || 'developer') as JobRow['job_type']
      const empType = values.employment_type as JobRow['employment_type']
      if (props.job) {
        const { error } = await sb
          .from('jobs')
          .update({
            job_title: values.title,
            company_name: values.company,
            job_description: values.description,
            location: values.location,
            apply_url: values.apply_url,
            employment_type: empType,
            experience_level: expLevel,
            work_mode: workMode,
            job_type: jobType,
          })
          .eq('id', props.job.id)
        if (error) throw error
      } else {
        const { error } = await sb.from('jobs').insert({
          recruiter_id: props.recruiter.id,
          job_slug,
          job_title: values.title,
          company_name: values.company,
          job_description: values.description,
          location: values.location,
          apply_url: values.apply_url,
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
        if (error) throw error
      }
    },
    onSuccess: () => {
      toast.success('Job saved')
      setOpen(false)
      props.onSaved()
    },
    onError: () => toast.error('Save failed'),
  })

  return (
    <>
      <Button
        size='sm'
        variant={props.job ? 'outline' : 'default'}
        onClick={() => setOpen(true)}
      >
        {props.job ? (
          'Edit'
        ) : (
          <>
            <Plus className='me-1 size-4' /> New job
          </>
        )}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>{props.job ? 'Edit job' : 'New job'}</DialogTitle>
        </DialogHeader>
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
              name='apply_url'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apply URL</FormLabel>
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
                    <Textarea rows={6} {...field} />
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
            <DialogFooter className='gap-2 pt-2'>
              <Button type='button' variant='ghost' onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type='submit' disabled={save.isPending}>
                Save draft
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
    </>
  )
}

function PayJobButton (props: { job: JobRow; accessToken: string | undefined }) {
  const [planOpen, setPlanOpen] = useState(false)
  const [plan, setPlan] = useState<PaymentPlan>('standard_week')

  const startPay = async () => {
    if (!props.accessToken) {
      toast.error('Sign in again')
      return
    }
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
    })
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
            <Button onClick={() => void startPay()}>Pay with Razorpay</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function FeaturedBoostButton (props: {
  job: JobRow
  accessToken: string | undefined
}) {
  const [planOpen, setPlanOpen] = useState(false)
  const [plan, setPlan] = useState<PaymentPlan>('featured_week')
  const featuredPlans: PaymentPlan[] = ['featured_week', 'featured_month']

  const startPay = async () => {
    if (!props.accessToken) {
      toast.error('Sign in again')
      return
    }
    await startRazorpayJobCheckout({
      jobId: props.job.id,
      plan,
      accessToken: props.accessToken,
      onPaid: () => {
        toast.success(props.job.featured ? 'Featured window extended' : 'Listing upgraded to Featured')
        setPlanOpen(false)
        window.location.reload()
      },
      onError: (m) => toast.error(m),
    })
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
            Applies to this live listing: extends visibility and sets the Featured badge after
            payment.
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
            <Button onClick={() => void startPay()}>Pay with Razorpay</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
