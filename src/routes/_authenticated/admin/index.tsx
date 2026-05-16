import { createFileRoute, Link } from '@tanstack/react-router'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useAdminDashboardStats } from '@/features/admin/hooks/use-admin-dashboard-stats'

function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export const Route = createFileRoute('/_authenticated/admin/')({
  component: AdminDashboardPage,
})

function AdminDashboardPage() {
  const stats = useAdminDashboardStats()

  return (
    <div className='space-y-6 py-6'>
      <div>
        <h1 className='text-2xl font-semibold tracking-tight'>Dashboard</h1>
        <p className='text-sm text-muted-foreground'>
          Operations overview for Beonely listings and revenue.
        </p>
      </div>

      {stats.isLoading ? (
        <div className='flex justify-center py-12'>
          <Loader2 className='size-8 animate-spin text-muted-foreground' />
        </div>
      ) : null}

      {stats.isError ? (
        <Alert variant='destructive'>
          <AlertCircle className='size-4' />
          <AlertTitle>Could not load dashboard</AlertTitle>
          <AlertDescription>
            {(stats.error as Error)?.message ?? 'Unknown error'}
          </AlertDescription>
          <Button
            type='button'
            variant='outline'
            className='mt-3'
            onClick={() => void stats.refetch()}
          >
            Try again
          </Button>
        </Alert>
      ) : null}

      {stats.data ? (
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          <Card>
            <CardHeader className='pb-2'>
              <CardDescription>Revenue (30 days)</CardDescription>
              <CardTitle className='text-2xl tabular-nums'>
                {formatInr(stats.data.revenue30dInr)}
              </CardTitle>
            </CardHeader>
            <CardContent className='text-xs text-muted-foreground'>
              All-time paid: {formatInr(stats.data.revenueAllTimeInr)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className='pb-2'>
              <CardDescription>Pending moderation</CardDescription>
              <CardTitle className='text-2xl tabular-nums'>
                {stats.data.pendingModeration}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button asChild variant='outline' size='sm'>
                <Link to='/admin/jobs' search={{ queue: 'pending' }}>
                  Review queue
                </Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className='pb-2'>
              <CardDescription>Active listings</CardDescription>
              <CardTitle className='text-2xl tabular-nums'>
                {stats.data.activeListings}
              </CardTitle>
            </CardHeader>
            <CardContent className='text-xs text-muted-foreground'>
              Approved, paid, not expired
            </CardContent>
          </Card>
          <Card>
            <CardHeader className='pb-2'>
              <CardDescription>Recruiters</CardDescription>
              <CardTitle className='text-2xl tabular-nums'>
                {stats.data.recruiterCount}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button asChild variant='outline' size='sm'>
                <Link to='/admin/recruiters'>Manage</Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className='pb-2'>
              <CardDescription>Candidates</CardDescription>
              <CardTitle className='text-2xl tabular-nums'>
                {stats.data.candidateCount}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button asChild variant='outline' size='sm'>
                <Link to='/admin/candidates'>View list</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
