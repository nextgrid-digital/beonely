import { createFileRoute } from '@tanstack/react-router'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
import { useAdminRevenue } from '@/features/admin/hooks/use-admin-revenue'
import { useAdminDashboardStats } from '@/features/admin/hooks/use-admin-dashboard-stats'

function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatInrFromPaise(paise: number): string {
  return formatInr(paise / 100)
}

export const Route = createFileRoute('/_authenticated/admin/revenue/')({
  component: AdminRevenuePage,
})

function AdminRevenuePage() {
  const revenue = useAdminRevenue()
  const stats = useAdminDashboardStats()

  return (
    <div className='space-y-6 py-6'>
      <div>
        <h1 className='text-2xl font-semibold tracking-tight'>Revenue</h1>
        <p className='text-sm text-muted-foreground'>
          Payment records from Razorpay (read-only).
        </p>
      </div>

      {stats.data ? (
        <p className='text-sm text-muted-foreground'>
          Totals: {formatInr(stats.data.revenue30dInr)} (30d) ·{' '}
          {formatInr(stats.data.revenueAllTimeInr)} (all-time paid)
        </p>
      ) : null}

      {revenue.isLoading ? (
        <div className='flex justify-center py-12'>
          <Loader2 className='size-8 animate-spin text-muted-foreground' />
        </div>
      ) : null}

      {revenue.isError ? (
        <Alert variant='destructive'>
          <AlertCircle className='size-4' />
          <AlertTitle>Could not load payments</AlertTitle>
          <AlertDescription>
            {(revenue.error as Error)?.message ?? 'Unknown error'}
          </AlertDescription>
          <Button
            type='button'
            variant='outline'
            className='mt-3'
            onClick={() => void revenue.refetch()}
          >
            Try again
          </Button>
        </Alert>
      ) : null}

      {revenue.data ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Recruiter</TableHead>
              <TableHead>Job</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Razorpay</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {revenue.data.map((row) => (
              <TableRow key={row.id}>
                <TableCell className='whitespace-nowrap text-sm tabular-nums'>
                  {new Date(row.created_at).toLocaleString()}
                </TableCell>
                <TableCell>
                  <div className='text-sm'>{row.recruiter_email}</div>
                  <div className='text-xs text-muted-foreground'>
                    {row.company_name}
                  </div>
                </TableCell>
                <TableCell className='text-sm'>{row.job_title ?? '—'}</TableCell>
                <TableCell className='tabular-nums'>
                  {formatInrFromPaise(row.amount)}
                </TableCell>
                <TableCell>
                  <Badge variant='outline'>{row.status}</Badge>
                </TableCell>
                <TableCell className='max-w-48 truncate font-mono text-xs text-muted-foreground'>
                  {row.razorpay_payment_id ?? row.razorpay_order_id ?? '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
    </div>
  )
}
