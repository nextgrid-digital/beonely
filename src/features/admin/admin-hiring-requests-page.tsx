import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useAdminHiringRequests } from '@/features/admin/hooks/use-admin-hiring-requests'

function formatHeadcount(value: number | null | undefined) {
  if (!value) return '—'
  return `${value}`
}

function prettify(value: string | null | undefined) {
  if (!value) return '—'
  return value.replace(/_/g, ' ')
}

export function AdminHiringRequestsPage() {
  const query = useAdminHiringRequests()
  const requests = query.data ?? []

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

      {requests.length === 0 ? (
        <div className='rounded-2xl border border-dashed p-8 text-sm text-muted-foreground'>
          No hiring requests yet. The public /hire form will surface buyer intent here.
        </div>
      ) : (
        <div className='grid gap-4'>
          {requests.map((request) => (
            <article key={request.id} className='rounded-2xl border bg-card p-5 shadow-sm'>
              <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                <div>
                  <h2 className='text-lg font-semibold tracking-tight'>
                    {request.role_title}
                  </h2>
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
                  <h3 className='font-medium'>Notes</h3>
                  <p className='mt-2 whitespace-pre-wrap text-sm text-muted-foreground'>
                    {request.notes ?? '—'}
                  </p>
                </section>
              </div>
            </article>
          ))}
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
