import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getSupabaseBrowserClient,
  getSupabaseConfigured,
} from '@/lib/supabase/client'
import type { Enums, Tables } from '@/lib/supabase/database.types'
import { useRecruiterJobWorkspace } from '@/features/recruiter/recruiter-job-workspace-context'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { InboxList } from '@/components/inbox/inbox-list'
import type { InboxRowData } from '@/components/inbox/inbox-list-row'
import type { InboxPillItem } from '@/components/inbox/inbox-status-pill'
import { PeekPanel } from '@/components/peek/peek-panel'
import { ApplicationProfileSnapshotReadonly } from '@/features/recruiter/application-profile-snapshot-readonly'

type ApplicationRow = Tables<'applications'>
type ApplicationStatus = Enums<'application_status'>
type ApplicantsTab = 'all' | ApplicationStatus

const STATUS_OPTIONS: ApplicationStatus[] = [
  'new',
  'reviewed',
  'shortlisted',
  'rejected',
]

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  new: 'New',
  reviewed: 'Reviewed',
  shortlisted: 'Shortlisted',
  rejected: 'Rejected',
}

function applicationStatusPill(status: ApplicationStatus): InboxPillItem {
  switch (status) {
    case 'new':
      return { label: 'New', variant: 'info' }
    case 'reviewed':
      return { label: 'Reviewed', variant: 'muted' }
    case 'shortlisted':
      return { label: 'Shortlisted', variant: 'success' }
    case 'rejected':
      return { label: 'Rejected', variant: 'danger' }
    default: {
      const _exhaustive: never = status
      return _exhaustive
    }
  }
}

export function RecruiterJobApplicantsList() {
  const { jobId } = useRecruiterJobWorkspace()
  const qc = useQueryClient()
  const [profileSheetApp, setProfileSheetApp] = useState<ApplicationRow | null>(
    null
  )
  const [tab, setTab] = useState<ApplicantsTab>('all')
  const [searchQuery, setSearchQuery] = useState('')

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

  const apps = appsQuery.data ?? []
  const normalizedQuery = searchQuery.trim().toLowerCase()

  const rows: InboxRowData[] = apps
    .filter((app) => (tab === 'all' ? true : app.status === tab))
    .filter((app) =>
      normalizedQuery
        ? [app.candidate_name, app.candidate_email, app.current_company]
            .filter(Boolean)
            .some((v) => (v as string).toLowerCase().includes(normalizedQuery))
        : true
    )
    .map((app) => ({
      id: app.id,
      title: app.candidate_name,
      preview: app.current_company ?? app.candidate_email,
      pills: [applicationStatusPill(app.status)],
      timestamp: app.created_at,
    }))

  const tabPills = [
    { id: 'all' as const, label: 'All', count: apps.length },
    ...STATUS_OPTIONS.map((status) => ({
      id: status,
      label: STATUS_LABEL[status],
      count: apps.filter((app) => app.status === status).length,
    })),
  ]

  if (appsQuery.isError) {
    return (
      <p className='text-sm text-destructive'>
        Could not load applicants. Apply the latest database migration if this
        fails.
      </p>
    )
  }

  return (
    <div className='space-y-6'>
      <InboxList<ApplicantsTab>
        className='h-auto'
        title='Applicants'
        search={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder='Search applicants...'
        pills={tabPills}
        activeFilter={tab}
        onFilterChange={setTab}
        layoutId='recruiter-applicants'
        rows={rows}
        selectedId={profileSheetApp?.id ?? null}
        onSelect={(id) => {
          const next = apps.find((app) => app.id === id) ?? null
          setProfileSheetApp(next)
        }}
        loading={appsQuery.isLoading}
        emptyMessage='No applicants in this view yet.'
      />

      <PeekPanel
        open={Boolean(profileSheetApp)}
        onOpenChange={(open) => {
          if (!open) setProfileSheetApp(null)
        }}
        title={profileSheetApp?.candidate_name ?? 'Candidate profile'}
        description='Snapshot from when they applied.'
        bodyClassName='space-y-6 px-4 py-4 sm:px-6'
      >
        {profileSheetApp ? (
          <>
            <div className='space-y-2'>
              <Label htmlFor='applicant-status'>Status</Label>
              <Select
                value={profileSheetApp.status}
                disabled={updateStatus.isPending}
                onValueChange={(v) =>
                  updateStatus.mutate({
                    id: profileSheetApp.id,
                    status: v as ApplicationStatus,
                  })
                }
              >
                <SelectTrigger id='applicant-status' className='h-9 w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <dl className='grid gap-2 text-sm'>
              <ContactRow label='Email' value={profileSheetApp.candidate_email} />
              <ContactRow
                label='Phone'
                value={profileSheetApp.candidate_phone}
              />
              <ContactRow
                label='Company'
                value={profileSheetApp.current_company}
              />
              {profileSheetApp.linkedin_url ? (
                <div className='flex flex-wrap items-center gap-x-2'>
                  <dt className='text-muted-foreground'>LinkedIn</dt>
                  <dd>
                    <a
                      href={profileSheetApp.linkedin_url}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-primary underline-offset-4 hover:underline'
                    >
                      View profile
                    </a>
                  </dd>
                </div>
              ) : null}
              {profileSheetApp.resume_url ? (
                <div className='flex flex-wrap items-center gap-x-2'>
                  <dt className='text-muted-foreground'>Resume</dt>
                  <dd>
                    <a
                      href={profileSheetApp.resume_url}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-primary underline-offset-4 hover:underline'
                    >
                      Open resume / portfolio
                    </a>
                  </dd>
                </div>
              ) : profileSheetApp.resume_storage_path ? (
                <div className='flex flex-wrap items-center gap-x-2'>
                  <dt className='text-muted-foreground'>Resume</dt>
                  <dd className='text-muted-foreground'>Uploaded</dd>
                </div>
              ) : null}
            </dl>

            <ApplicationProfileSnapshotReadonly
              snapshot={profileSheetApp.resume_structured_snapshot}
            />
          </>
        ) : null}
      </PeekPanel>
    </div>
  )
}

function ContactRow({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  return (
    <div className='flex flex-wrap items-center gap-x-2'>
      <dt className='text-muted-foreground'>{label}</dt>
      <dd className='min-w-0 break-words'>{value?.trim() || '—'}</dd>
    </div>
  )
}
