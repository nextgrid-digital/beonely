import { createFileRoute, Link } from '@tanstack/react-router'
import {
  AlertCircle,
  ArrowRight,
  BriefcaseBusiness,
  IndianRupee,
  MailWarning,
  Send,
  Sparkles,
  UserRound,
  Users,
} from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAdminDashboardStats } from '@/features/admin/hooks/use-admin-dashboard-stats'

export const Route = createFileRoute('/_authenticated/admin/')({
  component: AdminDashboardPage,
})

function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

type MetricCardProps = {
  label: string
  value: string | number
  hint: string
  icon: typeof IndianRupee
}

function MetricCard({ label, value, hint, icon: Icon }: MetricCardProps) {
  return (
    <Card className='overflow-hidden border-border/70 bg-card/90 shadow-sm'>
      <CardContent className='p-5'>
        <div className='flex items-start justify-between gap-4'>
          <div className='min-w-0'>
            <p className='text-sm font-medium text-muted-foreground'>{label}</p>
            <p className='mt-2 text-2xl font-semibold tracking-tight tabular-nums'>
              {value}
            </p>
            <p className='mt-1 text-xs text-muted-foreground'>{hint}</p>
          </div>
          <div className='rounded-xl border border-border bg-muted/60 p-2.5 text-foreground'>
            <Icon className='size-5' aria-hidden />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function AdminDashboardPage() {
  const stats = useAdminDashboardStats()

  if (stats.isLoading) {
    return (
      <div className='space-y-6 py-2' aria-label='Loading dashboard'>
        <Skeleton className='h-44 rounded-2xl' />
        <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className='h-36 rounded-xl' />
          ))}
        </div>
      </div>
    )
  }

  if (stats.isError || !stats.data) {
    return (
      <Alert variant='destructive'>
        <AlertCircle className='size-4' />
        <AlertTitle>Could not load the operations dashboard</AlertTitle>
        <AlertDescription className='mt-2 flex flex-wrap items-center gap-3'>
          <span>{(stats.error as Error)?.message ?? 'Unknown error'}</span>
          <Button
            variant='outline'
            size='sm'
            onClick={() => void stats.refetch()}
          >
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  const data = stats.data
  const attention =
    data.pendingModeration +
    data.campaignsNeedingAttention +
    data.emailFailures7d

  return (
    <div className='space-y-7 py-1'>
      <section className='relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-card via-card to-primary/5 p-6 shadow-sm md:p-8'>
        <div
          className='pointer-events-none absolute -end-20 -top-24 size-64 rounded-full bg-primary/10 blur-3xl'
          aria-hidden
        />
        <div className='relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end'>
          <div className='max-w-2xl'>
            <Badge variant='outline' className='mb-4 gap-1.5 bg-background/70'>
              <Sparkles className='size-3.5' aria-hidden />
              Operations control centre
            </Badge>
            <h1 className='text-3xl font-semibold tracking-tight md:text-4xl'>
              Keep the marketplace moving.
            </h1>
            <p className='mt-3 max-w-xl text-sm leading-6 text-muted-foreground md:text-base'>
              Moderate paid listings, watch delivery health, and move the most
              important work forward from one focused workspace.
            </p>
          </div>
          <div className='flex flex-wrap gap-2'>
            <Button asChild>
              <Link to='/admin/jobs' search={{ queue: 'pending' }}>
                Review queue
                <ArrowRight className='size-4' aria-hidden />
              </Link>
            </Button>
            <Button asChild variant='outline' className='bg-background/70'>
              <Link to='/admin/email/campaigns/new'>
                <Send className='size-4' aria-hidden />
                New campaign
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section aria-labelledby='attention-heading' className='space-y-3'>
        <div className='flex items-center justify-between gap-3'>
          <div>
            <h2 id='attention-heading' className='text-lg font-semibold'>
              Needs attention
            </h2>
            <p className='text-sm text-muted-foreground'>
              {attention === 0
                ? 'Everything is clear right now.'
                : `${attention} item${attention === 1 ? '' : 's'} across priority queues.`}
            </p>
          </div>
          <Badge variant={attention > 0 ? 'destructive' : 'secondary'}>
            {attention} open
          </Badge>
        </div>
        <div className='grid gap-3 md:grid-cols-3'>
          <Link
            to='/admin/jobs'
            search={{ queue: 'pending' }}
            className='group rounded-xl border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md motion-reduce:transform-none'
          >
            <div className='flex items-center justify-between'>
              <BriefcaseBusiness className='size-5 text-muted-foreground' />
              <span className='text-2xl font-semibold tabular-nums'>
                {data.pendingModeration}
              </span>
            </div>
            <p className='mt-4 font-medium'>Moderation queue</p>
            <p className='mt-1 text-xs text-muted-foreground'>
              Paid or imported listings waiting for a decision
            </p>
          </Link>
          <Link
            to='/admin/email/campaigns'
            className='group rounded-xl border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md motion-reduce:transform-none'
          >
            <div className='flex items-center justify-between'>
              <Send className='size-5 text-muted-foreground' />
              <span className='text-2xl font-semibold tabular-nums'>
                {data.campaignsNeedingAttention}
              </span>
            </div>
            <p className='mt-4 font-medium'>Campaigns</p>
            <p className='mt-1 text-xs text-muted-foreground'>
              Sending or failed campaigns requiring review
            </p>
          </Link>
          <Link
            to='/admin/email/analytics'
            className='group rounded-xl border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md motion-reduce:transform-none'
          >
            <div className='flex items-center justify-between'>
              <MailWarning className='size-5 text-muted-foreground' />
              <span className='text-2xl font-semibold tabular-nums'>
                {data.emailFailures7d}
              </span>
            </div>
            <p className='mt-4 font-medium'>Delivery failures</p>
            <p className='mt-1 text-xs text-muted-foreground'>
              Failed, bounced, or complained in the last 7 days
            </p>
          </Link>
        </div>
      </section>

      <section aria-labelledby='metrics-heading' className='space-y-3'>
        <div>
          <h2 id='metrics-heading' className='text-lg font-semibold'>
            Marketplace snapshot
          </h2>
          <p className='text-sm text-muted-foreground'>
            Current operating scale and paid activity.
          </p>
        </div>
        <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
          <MetricCard
            label='Revenue · 30 days'
            value={formatInr(data.revenue30dInr)}
            hint={`${formatInr(data.revenueAllTimeInr)} paid all time`}
            icon={IndianRupee}
          />
          <MetricCard
            label='Active listings'
            value={data.activeListings}
            hint='Approved, paid, and not expired'
            icon={BriefcaseBusiness}
          />
          <MetricCard
            label='Recruiters'
            value={data.recruiterCount}
            hint='Marketplace supply accounts'
            icon={Users}
          />
          <MetricCard
            label='Candidates'
            value={data.candidateCount}
            hint='Profiles in the talent network'
            icon={UserRound}
          />
        </div>
      </section>

      <Card className='border-border/70'>
        <CardHeader className='pb-3'>
          <CardTitle className='text-base'>Quick paths</CardTitle>
        </CardHeader>
        <CardContent className='grid gap-2 sm:grid-cols-2 lg:grid-cols-4'>
          {[
            ['Hiring requests', '/admin/hiring-requests'],
            ['Recruiter access', '/admin/recruiters'],
            ['Candidate directory', '/admin/candidates'],
            ['Email automations', '/admin/email/automations'],
          ].map(([label, href]) => (
            <Button
              key={href}
              asChild
              variant='ghost'
              className='justify-between'
            >
              <Link to={href}>
                {label}
                <ArrowRight className='size-4 text-muted-foreground' />
              </Link>
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
