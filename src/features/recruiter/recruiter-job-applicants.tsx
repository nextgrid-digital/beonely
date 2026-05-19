import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  getSupabaseBrowserClient,
  getSupabaseConfigured,
} from '@/lib/supabase/client'
import type { Enums, Tables } from '@/lib/supabase/database.types'
import { useRecruiterJobWorkspace } from '@/features/recruiter/recruiter-job-workspace-context'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ApplicationProfileSnapshotReadonly } from '@/features/recruiter/application-profile-snapshot-readonly'

type ApplicationRow = Tables<'applications'>
type ApplicationStatus = Enums<'application_status'>

const STATUS_OPTIONS: ApplicationStatus[] = [
  'new',
  'reviewed',
  'shortlisted',
  'rejected',
]

export function RecruiterJobApplicantsList() {
  const { jobId } = useRecruiterJobWorkspace()
  const qc = useQueryClient()
  const [profileSheetApp, setProfileSheetApp] = useState<ApplicationRow | null>(
    null
  )

  const appsQuery = useQuery({
    queryKey: ['job-applicants', jobId],
    enabled: Boolean(getSupabaseConfigured() && jobId),
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

  return (
    <div className='space-y-6'>
      {appsQuery.isLoading && (
        <Loader2 className='size-6 animate-spin text-muted-foreground' />
      )}
      {appsQuery.isError && (
        <p className='text-sm text-destructive'>
          Could not load applicants. Apply the latest database migration if this
          fails.
        </p>
      )}

      <div className='space-y-3 md:hidden'>
        {(appsQuery.data ?? []).map((app) => (
          <div
            key={app.id}
            className='rounded-lg border border-border/80 bg-card p-4'
          >
            <div className='flex flex-wrap items-start justify-between gap-2'>
              <div>
                <p className='font-medium'>{app.candidate_name}</p>
                <p className='text-xs text-muted-foreground'>
                  {new Date(app.created_at).toLocaleString()}
                </p>
              </div>
              <Button
                type='button'
                variant='link'
                className='h-auto min-h-11 px-0 text-sm'
                onClick={() => setProfileSheetApp(app)}
              >
                View profile
              </Button>
            </div>
            <div className='mt-3 space-y-1 text-sm'>
              <p>{app.candidate_email}</p>
              <p>{app.candidate_phone ?? 'Phone not provided'}</p>
              <p>{app.current_company ?? 'Current company not provided'}</p>
              {app.linkedin_url ? (
                <a
                  href={app.linkedin_url}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-primary underline-offset-4 hover:underline'
                >
                  LinkedIn profile
                </a>
              ) : null}
              {app.resume_url ? (
                <a
                  href={app.resume_url}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='block text-primary underline-offset-4 hover:underline'
                >
                  Resume / Portfolio
                </a>
              ) : app.resume_storage_path ? (
                <span className='text-muted-foreground'>Resume uploaded</span>
              ) : null}
            </div>
            <div className='mt-3'>
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
                <SelectTrigger className='h-11 w-full'>
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
            </div>
          </div>
        ))}
      </div>
      <div className='hidden overflow-x-auto md:block'>
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
              <TableHead>Profile</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(appsQuery.data ?? []).map((app) => (
              <TableRow key={app.id}>
                <TableCell className='font-medium'>
                  {app.candidate_name}
                </TableCell>
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
                <TableCell className='text-xs whitespace-nowrap text-muted-foreground'>
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
                      <span className='text-muted-foreground'>
                        Resume uploaded
                      </span>
                    ) : null}
                    {!app.resume_url && !app.resume_storage_path ? '—' : null}
                  </div>
                </TableCell>
                <TableCell>
                  <Button
                    type='button'
                    variant='link'
                    className='h-auto px-0 text-sm'
                    onClick={() => setProfileSheetApp(app)}
                  >
                    View profile
                  </Button>
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
      </div>

      {!appsQuery.isLoading && (appsQuery.data ?? []).length === 0 && (
        <p className='text-sm text-muted-foreground'>No applicants yet.</p>
      )}

      <Sheet
        open={Boolean(profileSheetApp)}
        onOpenChange={(open) => {
          if (!open) setProfileSheetApp(null)
        }}
      >
        <SheetContent
          side='right'
          className='flex w-full flex-col gap-0 overflow-hidden sm:max-w-xl'
        >
          <SheetHeader className='shrink-0 border-b border-border pb-4'>
            <SheetTitle>Candidate profile</SheetTitle>
            <SheetDescription>
              Snapshot from when they applied. Contact details are in the table.
            </SheetDescription>
          </SheetHeader>
          <div className='min-h-0 flex-1 overflow-y-auto py-4'>
            {profileSheetApp ? (
              <ApplicationProfileSnapshotReadonly
                snapshot={profileSheetApp.resume_structured_snapshot}
              />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
