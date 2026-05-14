import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  getSupabaseBrowserClient,
  getSupabaseConfigured,
} from '@/lib/supabase/client'
import type { Enums, JobRow, RecruiterRow, Tables } from '@/lib/supabase/database.types'
import { useAuth } from '@/context/auth-provider'
import { Button } from '@/components/ui/button'
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

type ApplicationRow = Tables<'applications'>
type ApplicationStatus = Enums<'application_status'>

const STATUS_OPTIONS: ApplicationStatus[] = [
  'new',
  'reviewed',
  'shortlisted',
  'rejected',
]

export function RecruiterJobApplicants({ jobId }: { jobId: string }) {
  const { user } = useAuth()
  const navigate = useNavigate()
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

  const jobQuery = useQuery({
    queryKey: ['recruiter-job', jobId],
    enabled: Boolean(getSupabaseConfigured() && jobId),
    queryFn: async () => {
      const sb = getSupabaseBrowserClient()
      const { data, error } = await sb
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .maybeSingle()
      if (error) throw error
      return data as JobRow | null
    },
  })

  const recruiter = recruiterQuery.data
  const job = jobQuery.data

  useEffect(() => {
    if (!recruiterQuery.isSuccess || !jobQuery.isSuccess) return
    if (!recruiter || !job || job.recruiter_id !== recruiter.id) {
      void navigate({ to: '/recruiter', replace: true })
    }
  }, [recruiter, job, recruiterQuery.isSuccess, jobQuery.isSuccess, navigate])

  const appsQuery = useQuery({
    queryKey: ['job-applicants', jobId],
    enabled: Boolean(
      getSupabaseConfigured() &&
        jobId &&
        job &&
        recruiter &&
        job.recruiter_id === recruiter.id
    ),
    queryFn: async () => {
      const sb = getSupabaseBrowserClient()
      const { data, error } = await sb
        .from('applications')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as ApplicationRow[]
    },
  })

  const updateStatus = useMutation({
    mutationFn: async (input: { id: string; status: ApplicationStatus }) => {
      const sb = getSupabaseBrowserClient()
      const { error } = await sb
        .from('applications')
        .update({ status: input.status })
        .eq('id', input.id)
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['job-applicants', jobId] })
      toast.success('Status updated')
    },
    onError: () => toast.error('Could not update status'),
  })

  if (!getSupabaseConfigured()) {
    return (
      <p className='text-sm text-muted-foreground'>
        Connect Supabase to view applicants.
      </p>
    )
  }

  if (recruiterQuery.isLoading || jobQuery.isLoading) {
    return <Loader2 className='size-6 animate-spin text-muted-foreground' />
  }

  if (!recruiter || !job || job.recruiter_id !== recruiter.id) {
    return null
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-center gap-3'>
        <Button variant='ghost' size='sm' asChild>
          <Link to='/recruiter'>
            <ArrowLeft className='me-1 size-4' />
            Back to listings
          </Link>
        </Button>
      </div>
      <div>
        <h1 className='text-2xl font-semibold tracking-tight'>Applicants</h1>
        <p className='text-sm text-muted-foreground'>
          {job.job_title} · {job.company_name}
        </p>
      </div>

      {appsQuery.isLoading && (
        <Loader2 className='size-6 animate-spin text-muted-foreground' />
      )}
      {appsQuery.isError && (
        <p className='text-sm text-destructive'>
          Could not load applicants. Apply the latest database migration if this
          fails.
        </p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>LinkedIn</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Applied</TableHead>
            <TableHead>Links</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(appsQuery.data ?? []).map((app) => (
            <TableRow key={app.id}>
              <TableCell className='font-medium'>{app.candidate_name}</TableCell>
              <TableCell className='max-w-[10rem] truncate text-sm'>
                {app.candidate_email}
              </TableCell>
              <TableCell className='text-sm'>
                {app.candidate_phone ?? '—'}
              </TableCell>
              <TableCell className='max-w-[8rem] truncate text-sm'>
                {app.linkedin_url ? (
                  <a
                    href={app.linkedin_url}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-primary underline-offset-4 hover:underline'
                  >
                    Profile
                  </a>
                ) : (
                  '—'
                )}
              </TableCell>
              <TableCell className='text-sm'>
                {app.current_company ?? '—'}
              </TableCell>
              <TableCell className='whitespace-nowrap text-xs text-muted-foreground'>
                {new Date(app.created_at).toLocaleString()}
              </TableCell>
              <TableCell className='text-sm'>
                <div className='flex flex-col gap-1'>
                  {app.resume_url ? (
                    <a
                      href={app.resume_url}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-primary underline-offset-4 hover:underline'
                    >
                      Portfolio
                    </a>
                  ) : null}
                  {app.resume_storage_path ? (
                    <span className='text-muted-foreground'>Resume uploaded</span>
                  ) : null}
                  {!app.resume_url && !app.resume_storage_path ? '—' : null}
                </div>
              </TableCell>
              <TableCell>
                <Select
                  value={app.status}
                  disabled={updateStatus.isPending}
                  onValueChange={(v) =>
                    updateStatus.mutate({
                      id: app.id,
                      status: v as ApplicationStatus,
                    })
                  }
                >
                  <SelectTrigger className='h-8 w-[9.5rem]'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {!appsQuery.isLoading && (appsQuery.data ?? []).length === 0 && (
        <p className='text-sm text-muted-foreground'>No applicants yet.</p>
      )}
    </div>
  )
}
