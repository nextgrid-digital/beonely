import { useQuery } from '@tanstack/react-query'
import { fetchEmailAnalytics } from '@/lib/email/admin-email-api'
import { useAuth } from '@/context/auth-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function AdminEmailAnalyticsPage() {
  const { session } = useAuth()
  const token = session?.access_token

  const query = useQuery({
    queryKey: ['admin-email-analytics', token],
    enabled: Boolean(token),
    queryFn: () => fetchEmailAnalytics(token!),
  })

  if (query.isLoading) return <Skeleton className='h-64 w-full' />
  if (query.isError) {
    return (
      <p className='text-sm text-destructive'>
        {query.error instanceof Error ? query.error.message : 'Load failed'}
      </p>
    )
  }

  const data = query.data as {
    summary: Record<string, number>
    by_trigger: Record<string, number>
    by_status: Record<string, number>
    campaign_delivery: Record<string, number>
    recent_sends: Array<{
      id: string
      trigger_key: string | null
      recipient_email: string
      status: string
      subject: string | null
      created_at: string
    }>
  }

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-semibold tracking-tight'>Analytics</h1>
        <p className='text-sm text-muted-foreground'>
          Delivery log for transactional sends and campaigns (last 30 days).
        </p>
      </div>
      <div className='grid gap-4 sm:grid-cols-3'>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm'>Transactional (30d)</CardTitle>
          </CardHeader>
          <CardContent className='text-2xl font-semibold tabular-nums'>
            {data.summary.transactional_30d ?? 0}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm'>Campaigns</CardTitle>
          </CardHeader>
          <CardContent className='text-2xl font-semibold tabular-nums'>
            {data.summary.campaigns_total ?? 0}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm'>Campaign recipients (30d)</CardTitle>
          </CardHeader>
          <CardContent className='text-2xl font-semibold tabular-nums'>
            {data.summary.campaign_recipients_30d ?? 0}
          </CardContent>
        </Card>
      </div>
      <div className='grid gap-6 lg:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>By trigger</CardTitle>
          </CardHeader>
          <CardContent className='space-y-1 text-sm'>
            {Object.entries(data.by_trigger ?? {}).map(([k, v]) => (
              <div key={k} className='flex justify-between'>
                <span>{k}</span>
                <span className='tabular-nums'>{v}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Campaign delivery</CardTitle>
          </CardHeader>
          <CardContent className='space-y-1 text-sm'>
            {Object.entries(data.campaign_delivery ?? {}).map(([k, v]) => (
              <div key={k} className='flex justify-between'>
                <span>{k}</span>
                <span className='tabular-nums'>{v}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <div>
        <h2 className='mb-3 text-lg font-medium'>Recent sends</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Trigger</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data.recent_sends ?? []).map((row) => (
              <TableRow key={row.id}>
                <TableCell className='text-sm text-muted-foreground'>
                  {new Date(row.created_at).toLocaleString()}
                </TableCell>
                <TableCell>{row.trigger_key ?? '—'}</TableCell>
                <TableCell>{row.recipient_email}</TableCell>
                <TableCell>{row.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
