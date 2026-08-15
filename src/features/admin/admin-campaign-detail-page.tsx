import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { fetchCampaignDetail } from '@/lib/email/admin-email-api'
import { useAuth } from '@/context/auth-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AdminQueryError } from '@/features/admin/admin-query-error'

export function AdminCampaignDetailPage({
  campaignId,
}: {
  campaignId: string
}) {
  const { session } = useAuth()
  const token = session?.access_token
  const [page, setPage] = useState(1)

  const query = useQuery({
    queryKey: [
      'admin-campaign-detail',
      session?.user.id,
      token,
      campaignId,
      page,
    ],
    enabled: Boolean(token),
    queryFn: () => fetchCampaignDetail(token!, campaignId, page),
  })

  if (query.isLoading) return <Skeleton className='h-64 w-full' />
  if (query.isError || !query.data) {
    return (
      <AdminQueryError
        title='Could not load campaign'
        error={query.error}
        retrying={query.isFetching}
        onRetry={() => void query.refetch()}
      />
    )
  }

  const { campaign, recipients, delivery_counts, pagination } = query.data

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <Button asChild variant='ghost' size='sm' className='mb-2 -ml-2'>
            <Link to='/admin/email/campaigns'>← Campaigns</Link>
          </Button>
          <h1 className='text-2xl font-semibold tracking-tight'>
            {campaign.subject}
          </h1>
          <p className='text-sm text-muted-foreground'>
            Audience: {campaign.audience} ·{' '}
            <Badge variant='outline'>{campaign.status}</Badge>
          </p>
        </div>
        <div className='flex flex-wrap gap-2 text-sm'>
          {Object.entries(delivery_counts).map(([status, count]) => (
            <Badge key={status} variant='secondary'>
              {status}: {count}
            </Badge>
          ))}
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Sent</TableHead>
            <TableHead>Error</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recipients.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.email}</TableCell>
              <TableCell>{r.recipient_type}</TableCell>
              <TableCell>{r.delivery_status}</TableCell>
              <TableCell className='text-sm text-muted-foreground'>
                {r.sent_at ? new Date(r.sent_at).toLocaleString() : '—'}
              </TableCell>
              <TableCell className='max-w-xs truncate text-sm text-destructive'>
                {r.error_message ?? '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className='flex items-center justify-between gap-3 text-sm text-muted-foreground'>
        <span>
          Showing {recipients.length} of {pagination.total} recipients
        </span>
        <div className='flex gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </Button>
          <Button
            type='button'
            variant='outline'
            size='sm'
            disabled={page * pagination.page_size >= pagination.total}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
