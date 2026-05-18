import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/auth-provider'
import { fetchCampaignDetail } from '@/lib/email/admin-email-api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'

export function AdminCampaignDetailPage({ campaignId }: { campaignId: string }) {
  const { session } = useAuth()
  const token = session?.access_token

  const query = useQuery({
    queryKey: ['admin-campaign-detail', token, campaignId],
    enabled: Boolean(token),
    queryFn: () => fetchCampaignDetail(token!, campaignId),
  })

  if (query.isLoading) return <Skeleton className='h-64 w-full' />
  if (query.isError || !query.data) {
    return <p className='text-sm text-destructive'>Could not load campaign.</p>
  }

  const { campaign, recipients, delivery_counts } = query.data

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
    </div>
  )
}
