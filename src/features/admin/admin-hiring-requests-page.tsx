import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  updateAdminHiringRequest,
  type HiringRequestRow,
} from '@/lib/hiring-requests'
import { useAuth } from '@/context/auth-provider'
import { useAdminHiringRequests } from '@/features/admin/hooks/use-admin-hiring-requests'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'

type DraftState = {
  status: HiringRequestRow['status']
  assigned_to_email: string
  internal_notes: string
}

const STATUS_OPTIONS: Array<{ value: HiringRequestRow['status']; label: string }> = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal_sent', label: 'Proposal sent' },
  { value: 'closed_won', label: 'Closed won' },
  { value: 'closed_lost', label: 'Closed lost' },
  { value: 'spam', label: 'Spam' },
]

function formatHeadcount(value: number | null | undefined) {
  if (!value) return '—'
  return `${value}`
}

function prettify(value: string | null | undefined) {
  if (!value) return '—'
  return value.replace(/_/g, ' ')
}

function lastTouchedLabel(value?: string | null) {
  if (!value) return 'No contact logged yet'
  return `Last contacted ${new Date(value).toLocaleString()}`
}

export function AdminHiringRequestsPage() {
  const query = useAdminHiringRequests()
  const { session } = useAuth()
  const token = session?.access_token
  const qc = useQueryClient()
  const requests = query.data ?? []
  const [drafts, setDrafts] = useState<Record<string, DraftState>>({})

  useEffect(() => {
    setDrafts((current) => {
      const next = { ...current }
      for (const request of requests) {
        if (!next[request.id]) {
          next[request.id] = {
            status: request.status,
            assigned_to_email: request.assigned_to_email ?? '',
            internal_notes: request.internal_notes ?? '',
          }
        }
      }
      return next
    })
  }, [requests])

  const saveMutation = useMutation({
    mutationFn: async (input: {
      id: string
      status: HiringRequestRow['status']
      assigned_to_email?: string | null
      internal_notes?: string | null
      touch_contacted_at?: boolean
    }) => {
      if (!token) throw new Error('missing_access_token')
      return updateAdminHiringRequest(token, input)
    },
    onSuccess: (updated) => {
      qc.setQueryData(['admin-hiring-requests'], (prev: HiringRequestRow[] | undefined) =>
        (prev ?? []).map((row) => (row.id === updated.id ? updated : row))
      )
      setDrafts((current) => ({
        ...current,
        [updated.id]: {
          status: updated.status,
          assigned_to_email: updated.assigned_to_email ?? '',
          internal_notes: updated.internal_notes ?? '',
        },
      }))
      toast.success('Hiring request updated')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Update failed')
    },
  })

  const summary = useMemo(() => {
    const counts = new Map<HiringRequestRow['status'], number>()
    for (const request of requests) {
      counts.set(request.status, (counts.get(request.status) ?? 0) + 1)
    }
    return STATUS_OPTIONS.map((option) => ({
      ...option,
      count: counts.get(option.value) ?? 0,
    }))
  }, [requests])

  if (query.isLoading) {
    return (
      <div className='space-y-4'>
        <Skeleton className='h-32 w-full rounded-2xl' />
        <Skeleton className='h-32 w-full rounded-2xl' />
        <Skeleton className='h-32 w-full rounded-2xl' />
      </div>
    )
  }

  if (query.error) {
    return (
      <Alert variant='destructive'>
        <AlertTitle>Could not load hiring requests</AlertTitle>
        <AlertDescription>
          {query.error instanceof Error ? query.error.message : 'Unknown error'}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className='space-y-6'>
      <div className='space-y-2'>
        <h1 className='text-2xl font-semibold tracking-tight'>Hiring requests</h1>
        <p className='text-sm text-muted-foreground'>
          Concierge demand captured from the public hire flow. These are the highest-signal
          buyer leads on Beonely right now.
        </p>
      </div>

      <div className='flex flex-wrap gap-2'>
        {summary.map((item) => (
          <Badge key={item.value} variant='outline' className='capitalize'>
            {item.label}: {item.count}
          </Badge>
        ))}
      </div>

      {requests.length === 0 ? (
        <div className='rounded-2xl border border-dashed p-8 text-sm text-muted-foreground'>
          No hiring requests yet. The public /hire form will surface buyer intent here.
        </div>
      ) : (
        <div className='grid gap-4'>
          {requests.map((request) => {
            const draft = drafts[request.id] ?? {
              status: request.status,
              assigned_to_email: request.assigned_to_email ?? '',
              internal_notes: request.internal_notes ?? '',
            }
            const busy = saveMutation.isPending && saveMutation.variables?.id === request.id

            return (
              <article key={request.id} className='rounded-2xl border bg-card p-5 shadow-sm'>
                <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                  <div>
                    <h2 className='text-lg font-semibold tracking-tight'>{request.role_title}</h2>
                    <p className='text-sm text-muted-foreground'>
                      {request.company_name} · {request.contact_name} · {request.email}
                    </p>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Badge variant='outline' className='capitalize'>
                      {request.status}
                    </Badge>
                    <span className='text-xs text-muted-foreground'>
                      {new Date(request.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                <dl className='mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4'>
                  <Info label='Phone' value={request.phone ?? '—'} />
                  <Info label='Website' value={request.company_website ?? '—'} />
                  <Info label='Hiring type' value={prettify(request.hiring_type)} />
                  <Info label='Work mode' value={prettify(request.work_mode)} />
                  <Info label='Location' value={request.location ?? '—'} />
                  <Info label='Timeline' value={request.timeline ?? '—'} />
                  <Info label='Headcount' value={formatHeadcount(request.headcount)} />
                  <Info label='Source' value={prettify(request.source)} />
                </dl>

                <div className='mt-4 grid gap-4 lg:grid-cols-2'>
                  <section className='rounded-xl bg-muted/40 p-4'>
                    <h3 className='font-medium'>ServiceNow scope</h3>
                    <p className='mt-2 whitespace-pre-wrap text-sm text-muted-foreground'>
                      {request.servicenow_scope ?? '—'}
                    </p>
                  </section>
                  <section className='rounded-xl bg-muted/40 p-4'>
                    <h3 className='font-medium'>Buyer notes</h3>
                    <p className='mt-2 whitespace-pre-wrap text-sm text-muted-foreground'>
                      {request.notes ?? '—'}
                    </p>
                  </section>
                </div>

                <section className='mt-4 rounded-xl border p-4'>
                  <div className='grid gap-4 lg:grid-cols-3'>
                    <div className='space-y-2'>
                      <Label>Status</Label>
                      <Select
                        value={draft.status}
                        onValueChange={(value) =>
                          setDrafts((current) => ({
                            ...current,
                            [request.id]: {
                              ...draft,
                              status: value as HiringRequestRow['status'],
                            },
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className='space-y-2 lg:col-span-2'>
                      <Label>Owner email</Label>
                      <Input
                        value={draft.assigned_to_email}
                        placeholder='nextgrid_os@agentmail.to'
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [request.id]: {
                              ...draft,
                              assigned_to_email: event.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className='mt-4 space-y-2'>
                    <Label>Internal notes</Label>
                    <Textarea
                      value={draft.internal_notes}
                      placeholder='Qualification notes, next step, pricing, objections, sourcing approach…'
                      className='min-h-28'
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [request.id]: {
                            ...draft,
                            internal_notes: event.target.value,
                          },
                        }))
                      }
                    />
                    <p className='text-xs text-muted-foreground'>
                      {lastTouchedLabel(request.last_contacted_at)}
                    </p>
                  </div>

                  <div className='mt-4 flex flex-wrap gap-2'>
                    <Button
                      type='button'
                      disabled={busy}
                      onClick={() =>
                        saveMutation.mutate({
                          id: request.id,
                          status: draft.status,
                          assigned_to_email: draft.assigned_to_email || null,
                          internal_notes: draft.internal_notes || null,
                        })
                      }
                    >
                      {busy ? <Loader2 className='size-4 animate-spin' /> : null}
                      Save pipeline state
                    </Button>
                    <Button
                      type='button'
                      variant='outline'
                      disabled={busy}
                      onClick={() =>
                        saveMutation.mutate({
                          id: request.id,
                          status: 'contacted',
                          assigned_to_email: draft.assigned_to_email || null,
                          internal_notes: draft.internal_notes || null,
                          touch_contacted_at: true,
                        })
                      }
                    >
                      Mark contacted now
                    </Button>
                  </div>
                </section>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className='text-xs uppercase tracking-wide text-muted-foreground'>{label}</dt>
      <dd className='mt-1 break-words text-foreground'>{value}</dd>
    </div>
  )
}
