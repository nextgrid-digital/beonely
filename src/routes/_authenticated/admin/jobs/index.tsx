import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { MoreHorizontal } from 'lucide-react'
import { z } from 'zod'
import { toast } from 'sonner'
import { formatQueryError } from '@/lib/format-query-error'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { listingDurationToDays } from '@/lib/payments/plans'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { JobRow } from '@/lib/supabase/database.types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { JobDescriptionRichTextField } from '@/features/jobs/job-description-rich-text-field'
import {
  plainTextFromJobDescription,
  sanitizeJobDescriptionHtml,
} from '@/lib/jobs/sanitize-job-description-html'
import { useAuth } from '@/context/auth-provider'
import { notifyJobStatus } from '@/lib/email/admin-email-api'

const adminJobsSearchSchema = z.object({
  queue: z
    .enum(['pending', 'approved', 'rejected', 'all'])
    .optional()
    .catch('all'),
})

type AdminJobsQueue = z.infer<typeof adminJobsSearchSchema>['queue']

const QUEUE_TABS: { id: NonNullable<AdminJobsQueue>; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'all', label: 'All' },
]

function filterJobsByQueue(jobs: JobRow[], queue: AdminJobsQueue): JobRow[] {
  const q = queue ?? 'all'
  if (q === 'pending') {
    return jobs.filter(
      (j) =>
        j.approval_status === 'pending' &&
        (j.payment_status === 'paid' || j.source_kind === 'linkedin_import')
    )
  }
  if (q === 'approved') {
    return jobs.filter((j) => j.approval_status === 'approved')
  }
  if (q === 'rejected') {
    return jobs.filter((j) => j.approval_status === 'rejected')
  }
  return jobs
}

export const Route = createFileRoute('/_authenticated/admin/jobs/')({
  validateSearch: adminJobsSearchSchema,
  component: AdminJobsPage,
})

function AdminJobsPage() {
  const { queue } = Route.useSearch()
  const { session } = useAuth()
  const accessToken = session?.access_token
  const qc = useQueryClient()
  const [editingJob, setEditingJob] = useState<JobRow | null>(null)
  const [descriptionDraft, setDescriptionDraft] = useState('')
  const [rejectTarget, setRejectTarget] = useState<JobRow | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const jobsQuery = useQuery({
    queryKey: ['admin-jobs'],
    queryFn: async () => {
      const sb = getSupabaseBrowserClient()
      const { data, error } = await sb
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as JobRow[]
    },
  })

  const rejectJob = useMutation({
    mutationFn: async (input: { id: string; reason: string }) => {
      const sb = getSupabaseBrowserClient()
      const { error } = await sb
        .from('jobs')
        .update({ approval_status: 'rejected' })
        .eq('id', input.id)
      if (error) throw error
      return input
    },
    onSuccess: async ({ id: jobId, reason }) => {
      if (accessToken) {
        try {
          await notifyJobStatus({
            job_id: jobId,
            status: 'rejected',
            reason: reason.trim() || null,
            accessToken,
          })
        } catch {
          toast.message('Listing rejected; notification email may not have sent.')
        }
      }
      setRejectTarget(null)
      setRejectReason('')
      void qc.invalidateQueries({ queryKey: ['admin-jobs'] })
      void qc.invalidateQueries({ queryKey: ['admin-dashboard-stats'] })
      toast.success('Listing rejected')
    },
    onError: () => toast.error('Update failed'),
  })

  const approveListing = useMutation({
    mutationFn: async (job: JobRow) => {
      const sb = getSupabaseBrowserClient()
      const days = listingDurationToDays(job.listing_duration)
      const published = new Date()
      const expires = new Date(published)
      expires.setDate(expires.getDate() + days)

      const { error } = await sb
        .from('jobs')
        .update({
          approval_status: 'approved',
          listing_expires_at: expires.toISOString(),
          featured_expiry:
            job.featured && job.listing_tier === 'featured'
              ? expires.toISOString()
              : null,
        })
        .eq('id', job.id)
      if (error) throw error
    },
    onSuccess: async (_data, job) => {
      if (accessToken) {
        try {
          await notifyJobStatus({
            job_id: job.id,
            status: 'approved',
            accessToken,
          })
        } catch {
          toast.message('Listing approved; notification email may not have sent.')
        }
      }
      void qc.invalidateQueries({ queryKey: ['admin-jobs'] })
      void qc.invalidateQueries({ queryKey: ['admin-dashboard-stats'] })
      void qc.invalidateQueries({ queryKey: ['public-jobs'] })
      toast.success('Listing approved')
    },
    onError: () => toast.error('Approve failed'),
  })

  const toggleFeatured = useMutation({
    mutationFn: async (job: JobRow) => {
      const sb = getSupabaseBrowserClient()
      const next = !job.featured
      const { error } = await sb
        .from('jobs')
        .update({
          featured: next,
          featured_expiry:
            next && job.listing_expires_at ? job.listing_expires_at : null,
        })
        .eq('id', job.id)
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-jobs'] })
      toast.success('Featured updated')
    },
    onError: () => toast.error('Update failed'),
  })

  const updateJobDescription = useMutation({
    mutationFn: async (input: {
      id: string
      job_slug: string
      description: string
    }) => {
      const sb = getSupabaseBrowserClient()
      const { error } = await sb
        .from('jobs')
        .update({ job_description: input.description })
        .eq('id', input.id)
      if (error) throw error
      return input
    },
    onSuccess: (input) => {
      void qc.invalidateQueries({ queryKey: ['admin-jobs'] })
      void qc.invalidateQueries({ queryKey: ['public-jobs'] })
      void qc.invalidateQueries({ queryKey: ['job', input.job_slug] })
      setEditingJob(null)
      toast.success('Description updated')
    },
    onError: () => toast.error('Could not save description'),
  })

  const openEditDescription = (job: JobRow) => {
    setEditingJob(job)
    setDescriptionDraft(job.job_description ?? '')
  }

  const saveDescription = () => {
    if (!editingJob) return
    const safe = sanitizeJobDescriptionHtml(descriptionDraft)
    const plain = plainTextFromJobDescription(safe)
    if (!plain) {
      toast.error('Description cannot be empty')
      return
    }
    updateJobDescription.mutate({
      id: editingJob.id,
      job_slug: editingJob.job_slug,
      description: safe,
    })
  }

  const filteredJobs = useMemo(
    () => filterJobsByQueue(jobsQuery.data ?? [], queue),
    [jobsQuery.data, queue]
  )

  const stickyHead = 'sticky z-10 bg-background'
  const stickyCell =
    'sticky z-10 bg-background group-hover:bg-muted/50 group-data-[state=selected]:bg-muted'

  return (
    <div className='min-w-0 max-w-full space-y-4 py-6'>
      <Dialog
        open={editingJob !== null}
        onOpenChange={(open) => {
          if (!open) setEditingJob(null)
        }}
      >
        <DialogContent className='max-h-[90vh] max-w-2xl overflow-y-auto'>
          {editingJob && (
            <>
              <DialogHeader>
                <DialogTitle>Edit job description</DialogTitle>
                <DialogDescription>
                  {editingJob.job_title} — {editingJob.company_name} (
                  {editingJob.source_kind})
                </DialogDescription>
              </DialogHeader>
              <div className='space-y-2'>
                <Link
                  to='/jobs/$slug'
                  params={{ slug: editingJob.job_slug }}
                  target='_blank'
                  rel='noreferrer'
                  className='text-sm font-medium text-primary underline-offset-4 hover:underline'
                >
                  Open public job page
                </Link>
                <div className='space-y-2 pt-2'>
                  <Label htmlFor='admin-job-description'>Description</Label>
                  <JobDescriptionRichTextField
                    value={descriptionDraft}
                    onChange={setDescriptionDraft}
                    editable
                  />
                </div>
              </div>
              <DialogFooter className='gap-2 sm:gap-0'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setEditingJob(null)}
                >
                  Cancel
                </Button>
                <Button
                  type='button'
                  disabled={updateJobDescription.isPending}
                  onClick={saveDescription}
                >
                  Save
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null)
            setRejectReason('')
          }
        }}
      >
        <DialogContent>
          {rejectTarget ? (
            <>
              <DialogHeader>
                <DialogTitle>Reject listing</DialogTitle>
                <DialogDescription>
                  {rejectTarget.job_title} — {rejectTarget.company_name}. The
                  recruiter will receive an email with your reason.
                </DialogDescription>
              </DialogHeader>
              <div className='space-y-2'>
                <Label htmlFor='reject-reason'>Reason (optional)</Label>
                <Textarea
                  id='reject-reason'
                  rows={4}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder='Explain why this listing was rejected…'
                />
              </div>
              <DialogFooter className='gap-2 sm:gap-0'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setRejectTarget(null)}
                >
                  Cancel
                </Button>
                <Button
                  type='button'
                  variant='destructive'
                  disabled={rejectJob.isPending}
                  onClick={() =>
                    rejectJob.mutate({
                      id: rejectTarget.id,
                      reason: rejectReason,
                    })
                  }
                >
                  Reject listing
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
      <div>
        <h1 className='text-2xl font-semibold tracking-tight'>Job moderation</h1>
        <p className='text-sm text-muted-foreground'>
          Approve paid listings, toggle featured, reject spam.
        </p>
      </div>
      <div className='flex flex-wrap gap-2'>
        {QUEUE_TABS.map((tab) => (
          <Link
            key={tab.id}
            to='/admin/jobs'
            search={{ queue: tab.id }}
            className={cn(
              'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
              (queue ?? 'all') === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>
      {jobsQuery.isError ? (
        <div className='space-y-4'>
          <Alert variant='destructive'>
            <AlertTitle>Could not load jobs</AlertTitle>
            <AlertDescription>
              {formatQueryError(
                jobsQuery.error,
                'Something went wrong while loading listings for moderation.'
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
      {!jobsQuery.isError ? (
        <div className='min-w-0 overflow-x-auto'>
          <Table className='min-w-[56rem]'>
        <TableHeader>
          <TableRow>
            <TableHead
              className={cn(
                stickyHead,
                'start-0 min-w-[10rem] max-w-[14rem]'
              )}
            >
              Title
            </TableHead>
            <TableHead className='min-w-[7rem]'>Company</TableHead>
            <TableHead className='hidden min-w-[8rem] sm:table-cell'>
              Plan
            </TableHead>
            <TableHead>Approval</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead className='hidden min-w-[7rem] lg:table-cell'>
              Source
            </TableHead>
            <TableHead className='hidden md:table-cell'>Created</TableHead>
            <TableHead
              className={cn(
                stickyHead,
                'end-0 w-12 text-end'
              )}
            >
              <span className='sr-only'>Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredJobs.map((job) => (
            <TableRow key={job.id} className='group'>
              <TableCell
                className={cn(
                  stickyCell,
                  'start-0 max-w-[14rem] font-medium whitespace-normal'
                )}
              >
                <Link
                  to='/jobs/$slug'
                  params={{ slug: job.job_slug }}
                  target='_blank'
                  rel='noreferrer'
                  className='line-clamp-2 hover:underline'
                  title={job.job_title}
                >
                  {job.job_title}
                </Link>
              </TableCell>
              <TableCell className='max-w-[10rem] truncate'>
                {job.company_name}
              </TableCell>
              <TableCell className='hidden text-sm capitalize sm:table-cell'>
                {job.listing_tier} · {job.listing_duration}
              </TableCell>
              <TableCell>
                <Badge variant='outline'>{job.approval_status}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant='outline'>{job.payment_status}</Badge>
              </TableCell>
              <TableCell className='hidden lg:table-cell'>
                {job.source_kind}
              </TableCell>
              <TableCell className='hidden text-sm text-muted-foreground tabular-nums md:table-cell'>
                {new Date(job.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell
                className={cn(
                  stickyCell,
                  'end-0 text-end'
                )}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type='button'
                      size='icon'
                      variant='outline'
                      className='size-8'
                      aria-label={`Actions for ${job.job_title}`}
                    >
                      <MoreHorizontal className='size-4' aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='end' className='w-48'>
                    <DropdownMenuItem
                      onClick={() => openEditDescription(job)}
                    >
                      Edit description
                    </DropdownMenuItem>
                    {job.approval_status === 'pending' &&
                      (job.payment_status === 'paid' ||
                        job.source_kind === 'linkedin_import') && (
                        <DropdownMenuItem
                          onClick={() => approveListing.mutate(job)}
                        >
                          Approve listing
                        </DropdownMenuItem>
                      )}
                    {job.approval_status !== 'rejected' ? (
                      <DropdownMenuItem
                        className='text-destructive focus:text-destructive'
                        onClick={() => {
                          setRejectTarget(job)
                          setRejectReason('')
                        }}
                      >
                        Reject listing
                      </DropdownMenuItem>
                    ) : null}
                    {job.approval_status === 'approved' &&
                    job.payment_status === 'paid' ? (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => toggleFeatured.mutate(job)}
                        >
                          {job.featured ? 'Unfeature' : 'Feature'} listing
                        </DropdownMenuItem>
                      </>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  )
}
