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

  const enabledCount =
    automationsQuery.data?.filter((r) => r.enabled).length ?? 0
  const marketing = statsQuery.data?.marketing
  const summary = analyticsQuery.data?.summary as
    | { transactional_30d?: number }
    | undefined

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-semibold tracking-tight'>Email</h1>
        <p className='text-sm text-muted-foreground'>
          Transactional automations, marketing campaigns, and delivery
          analytics.
        </p>
      </div>

      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        {statsQuery.isLoading ? (
          <Skeleton className='h-24' />
        ) : (
          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium'>
                Automations on
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className='text-2xl font-semibold tabular-nums'>
                {enabledCount}
                <span className='text-sm font-normal text-muted-foreground'>
                  {' '}
                  / {automationsQuery.data?.length ?? 0}
                </span>
              </p>
            </CardContent>
          </Card>
        )}
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
        {marketing ? (
          <>
            <Card>
              <CardHeader className='pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Marketing candidates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-2xl font-semibold tabular-nums'>
                  {marketing.candidates}
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
                  {marketing.recruiters}
                </p>
              </CardContent>
            </Card>
          </>
        ) : null}
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
