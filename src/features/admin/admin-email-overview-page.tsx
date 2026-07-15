import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  fetchAutomations,
  fetchCampaignStats,
  fetchEmailAnalytics,
} from '@/lib/email/admin-email-api'
import { useAuth } from '@/context/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AdminQueryError } from '@/features/admin/admin-query-error'

export function AdminEmailOverviewPage() {
  const { session } = useAuth()
  const token = session?.access_token

  const statsQuery = useQuery({
    queryKey: ['admin-campaign-stats', token],
    enabled: Boolean(token),
    queryFn: () => fetchCampaignStats(token!),
  })

  const analyticsQuery = useQuery({
    queryKey: ['admin-email-analytics-summary', token],
    enabled: Boolean(token),
    queryFn: () => fetchEmailAnalytics(token!),
  })

  const automationsQuery = useQuery({
    queryKey: ['admin-email-automations', token],
    enabled: Boolean(token),
    queryFn: () => fetchAutomations(token!),
  })

  const enabledCount = automationsQuery.data
    ? automationsQuery.data.filter((r) => r.enabled).length
    : null
  const marketing = statsQuery.data?.marketing
  const summary = analyticsQuery.data?.summary as
    | { transactional_30d?: number }
    | undefined
  const firstError =
    statsQuery.error ?? analyticsQuery.error ?? automationsQuery.error
  const hasError =
    statsQuery.isError || analyticsQuery.isError || automationsQuery.isError
  const isLoading =
    statsQuery.isLoading ||
    analyticsQuery.isLoading ||
    automationsQuery.isLoading
  const isRetrying =
    statsQuery.isFetching ||
    analyticsQuery.isFetching ||
    automationsQuery.isFetching

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-semibold tracking-tight'>Email</h1>
        <p className='text-sm text-muted-foreground'>
          Transactional automations, marketing campaigns, and delivery
          analytics.
        </p>
      </div>

      {hasError ? (
        <AdminQueryError
          title='Could not load all email metrics'
          error={firstError}
          retrying={isRetrying}
          onRetry={() => {
            void statsQuery.refetch()
            void analyticsQuery.refetch()
            void automationsQuery.refetch()
          }}
        />
      ) : null}

      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        {isLoading ? (
          Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className='h-24' />
          ))
        ) : (
          <>
            <Card>
              <CardHeader className='pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Automations on
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-2xl font-semibold tabular-nums'>
                  {enabledCount ?? '—'}
                  <span className='text-sm font-normal text-muted-foreground'>
                    {' '}
                    / {automationsQuery.data?.length ?? '—'}
                  </span>
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className='pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Sends (30 days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-2xl font-semibold tabular-nums'>
                  {summary?.transactional_30d ?? '—'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className='pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Marketing candidates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-2xl font-semibold tabular-nums'>
                  {marketing?.candidates ?? '—'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className='pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Marketing recruiters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-2xl font-semibold tabular-nums'>
                  {marketing?.recruiters ?? '—'}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className='flex flex-wrap gap-2'>
        <Button asChild>
          <Link to='/admin/email/campaigns'>Campaigns</Link>
        </Button>
        <Button asChild variant='outline'>
          <Link to='/admin/email/test'>Test send</Link>
        </Button>
        <Button asChild variant='outline'>
          <Link to='/admin/email/automations'>Automations</Link>
        </Button>
        <Button asChild variant='outline'>
          <Link to='/admin/email/analytics'>Analytics</Link>
        </Button>
      </div>
    </div>
  )
}
