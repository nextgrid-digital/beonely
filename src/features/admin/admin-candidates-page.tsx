import { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { InboxList } from '@/components/inbox/inbox-list'
import type { InboxRowData } from '@/components/inbox/inbox-list-row'
import { PeekPanel } from '@/components/peek/peek-panel'
import {
  useAdminCandidates,
  type AdminCandidateRow,
} from '@/features/admin/hooks/use-admin-candidates'
import { ApplicationProfileSnapshotReadonly } from '@/features/recruiter/application-profile-snapshot-readonly'

export function AdminCandidatesPage() {
  const query = useAdminCandidates()
  const [peekCandidate, setPeekCandidate] = useState<AdminCandidateRow | null>(
    null
  )
  const [searchQuery, setSearchQuery] = useState('')

  const candidates = query.data ?? []
  const normalizedQuery = searchQuery.trim().toLowerCase()

  const rows: InboxRowData[] = candidates
    .filter((row) =>
      normalizedQuery
        ? [row.full_name, row.email]
            .filter(Boolean)
            .some((v) => (v as string).toLowerCase().includes(normalizedQuery))
        : true
    )
    .map((row) => {
      const count = row.application_count
      return {
        id: row.id,
        title: row.full_name ?? row.email,
        preview: row.email,
        pills: [
          {
            label: `${count} application${count === 1 ? '' : 's'}`,
            variant: count > 0 ? ('info' as const) : ('muted' as const),
          },
        ],
        timestamp: row.last_profile_update_at ?? row.updated_at,
      }
    })

  if (query.isError) {
    return (
      <div className='py-6'>
        <Alert variant='destructive'>
          <AlertCircle className='size-4' />
          <AlertTitle>Could not load candidates</AlertTitle>
          <AlertDescription>
            {(query.error as Error)?.message ?? 'Unknown error'}
          </AlertDescription>
          <Button
            type='button'
            variant='outline'
            className='mt-3'
            onClick={() => void query.refetch()}
          >
            Try again
          </Button>
        </Alert>
      </div>
    )
  }

  return (
    <div className='space-y-6 py-6'>
      <InboxList<'all'>
        className='h-auto'
        title='Candidates'
        search={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder='Search candidates...'
        pills={[{ id: 'all', label: 'All', count: candidates.length }]}
        activeFilter='all'
        onFilterChange={() => undefined}
        layoutId='admin-candidates'
        rows={rows}
        selectedId={peekCandidate?.id ?? null}
        onSelect={(id) => {
          const next = candidates.find((c) => c.id === id) ?? null
          setPeekCandidate(next)
        }}
        loading={query.isLoading}
        emptyMessage='No candidates found.'
      />

      <PeekPanel
        open={Boolean(peekCandidate)}
        onOpenChange={(open) => {
          if (!open) setPeekCandidate(null)
        }}
        title={peekCandidate?.full_name ?? peekCandidate?.email ?? 'Candidate'}
        description={
          peekCandidate
            ? `${peekCandidate.email}${peekCandidate.phone ? ` · ${peekCandidate.phone}` : ''}`
            : undefined
        }
        bodyClassName='space-y-6 px-4 py-5 sm:px-6'
      >
        {peekCandidate ? (
          <>
            <dl className='grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2'>
              <div>
                <dt className='text-muted-foreground'>Email</dt>
                <dd className='font-medium'>{peekCandidate.email}</dd>
              </div>
              <div>
                <dt className='text-muted-foreground'>Phone</dt>
                <dd className='font-medium'>{peekCandidate.phone ?? '—'}</dd>
              </div>
              <div>
                <dt className='text-muted-foreground'>LinkedIn</dt>
                <dd className='font-medium'>
                  {peekCandidate.linkedin_url ? (
                    <a
                      href={peekCandidate.linkedin_url}
                      target='_blank'
                      rel='noreferrer'
                      className='text-primary underline-offset-4 hover:underline'
                    >
                      Profile
                    </a>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
              <div>
                <dt className='text-muted-foreground'>Portfolio</dt>
                <dd className='font-medium'>
                  {peekCandidate.portfolio_url ? (
                    <a
                      href={peekCandidate.portfolio_url}
                      target='_blank'
                      rel='noreferrer'
                      className='text-primary underline-offset-4 hover:underline'
                    >
                      Portfolio
                    </a>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
              <div>
                <dt className='text-muted-foreground'>Applications</dt>
                <dd className='font-medium tabular-nums'>
                  {peekCandidate.application_count}
                </dd>
              </div>
              <div>
                <dt className='text-muted-foreground'>Profile updated</dt>
                <dd className='font-medium'>
                  {new Date(
                    peekCandidate.last_profile_update_at ??
                      peekCandidate.updated_at
                  ).toLocaleString()}
                </dd>
              </div>
            </dl>

            <div>
              <h3 className='mb-2 text-sm font-medium text-foreground'>
                Resume
              </h3>
              <ApplicationProfileSnapshotReadonly
                snapshot={peekCandidate.resume_structured}
              />
            </div>
          </>
        ) : null}
      </PeekPanel>
    </div>
  )
}
