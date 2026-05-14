import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import { requireAdminBeforeLoad } from '@/lib/auth/route-guards'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'

export const Route = createFileRoute('/_authenticated/admin/jobs/')({
  beforeLoad: () =>
    requireAdminBeforeLoad({ loginRedirectPath: '/admin/jobs' }),
  component: AdminJobsPage,
})

function AdminJobsPage() {
  const qc = useQueryClient()
  const [editingJob, setEditingJob] = useState<JobRow | null>(null)
  const [descriptionDraft, setDescriptionDraft] = useState('')
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
    mutationFn: async (id: string) => {
      const sb = getSupabaseBrowserClient()
      const { error } = await sb
        .from('jobs')
        .update({ approval_status: 'rejected' })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-jobs'] })
      toast.success('Updated')
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
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-jobs'] })
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
    const trimmed = descriptionDraft.trim()
    if (!trimmed) {
      toast.error('Description cannot be empty')
      return
    }
    updateJobDescription.mutate({
      id: editingJob.id,
      job_slug: editingJob.job_slug,
      description: trimmed,
    })
  }

  return (
    <div className='space-y-4 px-4 py-6'>
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
                  <Label htmlFor='admin-job-description'>job_description</Label>
                  <Textarea
                    id='admin-job-description'
                    value={descriptionDraft}
                    onChange={(e) => setDescriptionDraft(e.target.value)}
                    className='min-h-[min(24rem,50vh)] font-mono text-sm'
                    spellCheck
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
      <div>
        <h1 className='text-2xl font-semibold tracking-tight'>Moderation</h1>
        <p className='text-sm text-muted-foreground'>
          Approve paid listings, toggle featured, reject spam.
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Approval</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead>Source</TableHead>
            <TableHead className='text-end'>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(jobsQuery.data ?? []).map((job) => (
            <TableRow key={job.id}>
              <TableCell className='font-medium'>{job.job_title}</TableCell>
              <TableCell>{job.company_name}</TableCell>
              <TableCell>
                <Badge variant='outline'>{job.approval_status}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant='outline'>{job.payment_status}</Badge>
              </TableCell>
              <TableCell>{job.source_kind}</TableCell>
              <TableCell className='text-end'>
                <div className='flex flex-wrap justify-end gap-2'>
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => openEditDescription(job)}
                  >
                    Edit description
                  </Button>
                  {job.approval_status === 'pending' &&
                    job.payment_status === 'paid' && (
                      <Button
                        size='sm'
                        onClick={() => approveListing.mutate(job)}
                      >
                        Approve
                      </Button>
                    )}
                  {job.approval_status !== 'rejected' && (
                    <Button
                      size='sm'
                      variant='destructive'
                      onClick={() => rejectJob.mutate(job.id)}
                    >
                      Reject
                    </Button>
                  )}
                  {job.approval_status === 'approved' &&
                    job.payment_status === 'paid' && (
                      <Button
                        size='sm'
                        variant='outline'
                        onClick={() => toggleFeatured.mutate(job)}
                      >
                        {job.featured ? 'Unfeature' : 'Feature'}
                      </Button>
                    )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
