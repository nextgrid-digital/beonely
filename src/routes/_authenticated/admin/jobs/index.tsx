import { useMemo, useState } from 'react'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { mutateAdminJob } from '@/lib/admin/admin-jobs-api'
import { apiGet } from '@/lib/api-client'
import { notifyJobStatus } from '@/lib/email/admin-email-api'
import { formatQueryError } from '@/lib/format-query-error'
import {
  plainTextFromJobDescription,
  sanitizeJobDescriptionHtml,
} from '@/lib/jobs/sanitize-job-description-html'
import type { JobRow } from '@/lib/supabase/database.types'
import { useAuth } from '@/context/auth-provider'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
import { InboxList } from '@/components/inbox/inbox-list'
import type { InboxRowData } from '@/components/inbox/inbox-list-row'
import type { InboxPillItem } from '@/components/inbox/inbox-status-pill'
import { PeekPanel } from '@/components/peek/peek-panel'
import { JobDescriptionRichTextField } from '@/features/jobs/job-description-rich-text-field'
import { JobDetailView } from '@/features/jobs/job-detail-view'

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

/** Right-aligned status pills for the admin moderation list (approval + payment/source). */
function adminJobPills(job: JobRow): InboxPillItem[] {
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
  if (job.source_kind === 'linkedin_import') {
    pills.push({ label: 'LinkedIn', variant: 'info' })
  } else if (job.payment_status === 'unpaid') {
    pills.push({ label: 'Unpaid', variant: 'attention' })
  } else if (job.featured) {
    pills.push({ label: 'Featured', variant: 'success' })
  }
  return pills.slice(0, 2)
}

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
  const navigate = useNavigate({ from: Route.fullPath })
  const { session } = useAuth()
  const accessToken = session?.access_token
  const qc = useQueryClient()
  const [editingJob, setEditingJob] = useState<JobRow | null>(null)
  const [descriptionDraft, setDescriptionDraft] = useState('')
  const [rejectTarget, setRejectTarget] = useState<JobRow | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [peekJobId, setPeekJobId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const jobsQuery = useQuery({
    queryKey: ['admin-jobs', accessToken],
    queryFn: async () => {
      if (!accessToken) throw new Error('missing_access_token')
      const result = await apiGet<{ jobs: JobRow[] }>(
        '/api/admin/jobs-list',
        accessToken
      )
      return result.jobs
    },
    enabled: Boolean(accessToken),
  })

  const rejectJob = useMutation({
    mutationFn: async (input: { id: string; reason: string }) => {
      if (!accessToken) throw new Error('missing_access_token')
      await mutateAdminJob(accessToken, {
        action: 'reject',
        job_id: input.id,
        reason: input.reason.trim() || null,
      })
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
          toast.message(
            'Listing rejected; notification email may not have sent.'
          )
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
      if (!accessToken) throw new Error('missing_access_token')
      return mutateAdminJob(accessToken, {
        action: 'approve',
        job_id: job.id,
      })
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
          toast.message(
            'Listing approved; notification email may not have sent.'
          )
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
      if (!accessToken) throw new Error('missing_access_token')
      return mutateAdminJob(accessToken, {
        action: 'set_featured',
        job_id: job.id,
        featured: !job.featured,
      })
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
      if (!accessToken) throw new Error('missing_access_token')
      await mutateAdminJob(accessToken, {
        action: 'update_description',
        job_id: input.id,
        description: input.description,
      })
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

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const rows: InboxRowData[] = filteredJobs
    .filter((job) =>
      normalizedQuery
        ? `${job.job_title} ${job.company_name}`
            .toLowerCase()
            .includes(normalizedQuery)
        : true
    )
    .map((job) => ({
      id: job.id,
      title: job.job_title,
      preview: job.company_name,
      pills: adminJobPills(job),
      timestamp: job.created_at,
    }))

  const allJobs = jobsQuery.data ?? []
  const queuePills = QUEUE_TABS.map((tab) => ({
    id: tab.id,
    label: tab.label,
    count: filterJobsByQueue(allJobs, tab.id).length,
  }))

  const peekJob = peekJobId
    ? (jobsQuery.data?.find((j) => j.id === peekJobId) ?? null)
    : null
  const peekCanApprove =
    peekJob?.approval_status === 'pending' &&
    (peekJob.payment_status === 'paid' ||
      peekJob.source_kind === 'linkedin_import')
  const peekCanFeature =
    peekJob?.approval_status === 'approved' && peekJob.payment_status === 'paid'

  return (
    <div className='max-w-full min-w-0 space-y-4 py-6'>
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
                    id='admin-job-description'
                    ariaLabel='Job description'
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
      ) : (
        <InboxList<NonNullable<AdminJobsQueue>>
          className='h-auto'
          title='Job moderation'
          search={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder='Search listings...'
          pills={queuePills}
          activeFilter={queue ?? 'all'}
          onFilterChange={(next) =>
            void navigate({
              search: (p) => ({ ...p, queue: next }),
            })
          }
          layoutId='admin-jobs'
          rows={rows}
          selectedId={peekJobId}
          onSelect={(id) => setPeekJobId(id)}
          loading={jobsQuery.isLoading}
          emptyMessage='No listings in this queue.'
        />
      )}

      <PeekPanel
        open={Boolean(peekJob)}
        onOpenChange={(open) => {
          if (!open) setPeekJobId(null)
        }}
        title={peekJob?.job_title ?? 'Job'}
        description={
          peekJob
            ? `${peekJob.company_name} · ${peekJob.approval_status} · ${peekJob.payment_status}`
            : undefined
        }
        bodyClassName='space-y-6 px-4 py-5 sm:px-6'
      >
        {peekJob ? (
          <>
            <div className='flex flex-wrap items-center gap-2'>
              {peekCanApprove ? (
                <Button
                  type='button'
                  size='sm'
                  disabled={approveListing.isPending}
                  onClick={() => approveListing.mutate(peekJob)}
                >
                  Approve
                </Button>
              ) : null}
              {peekJob.approval_status !== 'rejected' ? (
                <Button
                  type='button'
                  size='sm'
                  variant='destructive'
                  onClick={() => {
                    setRejectTarget(peekJob)
                    setRejectReason('')
                  }}
                >
                  Reject
                </Button>
              ) : null}
              {peekCanFeature ? (
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  disabled={toggleFeatured.isPending}
                  onClick={() => toggleFeatured.mutate(peekJob)}
                >
                  {peekJob.featured ? 'Unfeature' : 'Feature'}
                </Button>
              ) : null}
              <Button
                type='button'
                size='sm'
                variant='outline'
                onClick={() => openEditDescription(peekJob)}
              >
                Edit description
              </Button>
              <Button asChild size='sm' variant='ghost'>
                <Link
                  to='/jobs/$slug'
                  params={{ slug: peekJob.job_slug }}
                  target='_blank'
                  rel='noreferrer'
                >
                  Open public page
                </Link>
              </Button>
            </div>

            <JobDetailView
              job={peekJob}
              showApplySection={false}
              showSimilarJobs={false}
            />
          </>
        ) : null}
      </PeekPanel>
    </div>
  )
}
