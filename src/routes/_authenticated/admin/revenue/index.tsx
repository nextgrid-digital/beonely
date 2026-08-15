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
import { useAdminDashboardStats } from '@/features/admin/hooks/use-admin-dashboard-stats'
import { useAdminRevenue } from '@/features/admin/hooks/use-admin-revenue'

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
              <TableHead>Checkout</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Razorpay</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {revenue.data.map((row) => (
              <TableRow key={row.id}>
                <TableCell className='text-sm whitespace-nowrap tabular-nums'>
                  {new Date(row.paid_at ?? row.created_at).toLocaleString()}
                </TableCell>
                <TableCell>
                  <div className='text-sm'>{row.recruiter_email}</div>
                  <div className='text-xs text-muted-foreground'>
                    {row.company_name}
                  </div>
                </TableCell>
                <TableCell className='text-sm'>
                  {row.job_title ?? '—'}
                </TableCell>
                <TableCell className='tabular-nums'>
                  <div>{formatInrFromPaise(row.amount)}</div>
                  {row.refunded_amount + row.chargeback_amount > 0 ? (
                    <div className='text-xs text-muted-foreground'>
                      Net{' '}
                      {formatInrFromPaise(
                        Math.max(
                          row.amount -
                            Math.min(
                              row.refunded_amount + row.chargeback_amount,
                              row.amount
                            ),
                          0
                        )
                      )}
                    </div>
                  ) : null}
                </TableCell>
                <TableCell className='text-xs'>
                  <div className='capitalize'>{row.payment_kind}</div>
                  <div className='text-muted-foreground'>
                    {row.plan.replace(/_/g, ' ')}
                  </div>
                </TableCell>
                <TableCell>
                  <div className='flex flex-col items-start gap-1'>
                    <Badge variant='outline'>{row.status}</Badge>
                    {row.requires_manual_review ? (
                      <Badge variant='destructive'>Review</Badge>
                    ) : null}
                    {row.risk_status ? (
                      <span className='text-xs text-muted-foreground'>
                        {row.risk_status.replace(/_/g, ' ')}
                      </span>
                    ) : null}
                  </div>
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
