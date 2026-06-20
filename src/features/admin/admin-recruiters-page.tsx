import { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import type { RecruiterRow } from '@/lib/supabase/database.types'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { InboxList } from '@/components/inbox/inbox-list'
import type { InboxRowData } from '@/components/inbox/inbox-list-row'
import type { InboxPillItem } from '@/components/inbox/inbox-status-pill'
import { PeekPanel } from '@/components/peek/peek-panel'
import { useAdminRecruiters } from '@/features/admin/hooks/use-admin-recruiters'
import { useToggleRecruiterDisabled } from '@/features/admin/hooks/use-toggle-recruiter-disabled'

type RecruitersTab = 'all' | 'active' | 'disabled'

function recruiterPills(row: RecruiterRow): InboxPillItem[] {
  const pills: InboxPillItem[] = [
    {
      label: row.role === 'admin' ? 'Admin' : 'Recruiter',
      variant: row.role === 'admin' ? 'info' : 'muted',
    },
  ]
  if (row.disabled) {
    pills.push({ label: 'Disabled', variant: 'danger' })
  }
  return pills
}

export function AdminRecruitersPage() {
  const query = useAdminRecruiters()
  const toggleDisabled = useToggleRecruiterDisabled()
  const [peekId, setPeekId] = useState<string | null>(null)
  const [tab, setTab] = useState<RecruitersTab>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const recruiters = query.data ?? []
  const peekRecruiter: RecruiterRow | null =
    recruiters.find((r) => r.id === peekId) ?? null
  const normalizedQuery = searchQuery.trim().toLowerCase()

  const rows: InboxRowData[] = recruiters
    .filter((row) => {
      switch (tab) {
        case 'active':
          return !row.disabled
        case 'disabled':
          return row.disabled
        case 'all':
        default:
          return true
      }
    })
    .filter((row) =>
      normalizedQuery
        ? [row.company_name, row.email, row.name]
            .filter(Boolean)
            .some((v) => (v as string).toLowerCase().includes(normalizedQuery))
        : true
    )
    .map((row) => ({
      id: row.id,
      title: row.company_name,
      preview: row.email,
      pills: recruiterPills(row),
      timestamp: row.created_at,
      deemphasized: row.disabled,
    }))

  const tabPills = [
    { id: 'all' as const, label: 'All', count: recruiters.length },
    {
      id: 'active' as const,
      label: 'Active',
      count: recruiters.filter((r) => !r.disabled).length,
    },
    {
      id: 'disabled' as const,
      label: 'Disabled',
      count: recruiters.filter((r) => r.disabled).length,
    },
  ]

  if (query.isError) {
    return (
      <div className='py-6'>
        <Alert variant='destructive'>
          <AlertCircle className='size-4' />
          <AlertTitle>Could not load recruiters</AlertTitle>
          <AlertDescription>
            {(query.error as Error)?.message ?? 'Unknown error'}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className='space-y-6 py-6'>
      <InboxList<RecruitersTab>
        className='h-auto'
        title='Recruiters'
        search={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder='Search recruiters...'
        pills={tabPills}
        activeFilter={tab}
        onFilterChange={setTab}
        layoutId='admin-recruiters'
        rows={rows}
        selectedId={peekId}
        onSelect={(id) => setPeekId(id)}
        loading={query.isLoading}
        emptyMessage='No recruiters in this view.'
      />

      <PeekPanel
        open={Boolean(peekRecruiter)}
        onOpenChange={(open) => {
          if (!open) setPeekId(null)
        }}
        title={peekRecruiter?.company_name ?? 'Recruiter'}
        description={peekRecruiter?.email}
        bodyClassName='space-y-6 px-4 py-5 sm:px-6'
      >
        {peekRecruiter ? (
          <>
            <dl className='grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2'>
              <div>
                <dt className='text-muted-foreground'>Contact name</dt>
                <dd className='font-medium'>{peekRecruiter.name ?? '—'}</dd>
              </div>
              <div>
                <dt className='text-muted-foreground'>Email</dt>
                <dd className='font-medium'>{peekRecruiter.email}</dd>
              </div>
              <div>
                <dt className='text-muted-foreground'>Role</dt>
                <dd>
                  <Badge variant='secondary' className='capitalize'>
                    {peekRecruiter.role}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className='text-muted-foreground'>Created</dt>
                <dd className='font-medium'>
                  {new Date(peekRecruiter.created_at).toLocaleString()}
                </dd>
              </div>
            </dl>

            <div className='flex items-center justify-between gap-4 rounded-lg border border-border p-4'>
              <div>
                <Label htmlFor='recruiter-disabled-toggle'>
                  Disable account
                </Label>
                <p className='text-sm text-muted-foreground'>
                  Blocks recruiter portal access.
                </p>
              </div>
              <Switch
                id='recruiter-disabled-toggle'
                checked={peekRecruiter.disabled}
                disabled={toggleDisabled.isPending}
                onCheckedChange={(disabled) =>
                  toggleDisabled.mutate({ id: peekRecruiter.id, disabled })
                }
                aria-label={`Disable ${peekRecruiter.email}`}
              />
            </div>
          </>
        ) : null}
      </PeekPanel>
    </div>
  )
}
