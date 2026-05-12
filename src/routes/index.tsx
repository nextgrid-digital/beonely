import { z } from 'zod'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Briefcase, LineChart, Shield } from 'lucide-react'
import { PublicJobCard } from '@/features/jobs/public-job-card'
import { PublicJobListSkeleton } from '@/features/jobs/public-job-list-skeleton'
import {
  PublishedJobsFiltersBar,
  clearPublishedJobSearchPreserveSetup,
  hasActivePublishedJobFilters,
} from '@/features/jobs/published-jobs-filters'
import { PublicSiteFooter, PublicSiteHeader } from '@/features/jobs/public-site-layout'
import {
  fetchPublishedJobs,
  publishedJobsFilterSchema,
  type PublishedJobsFilters,
} from '@/lib/jobs/fetch-published-jobs'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

const homeSearchSchema = publishedJobsFilterSchema.merge(
  z.object({
    setup: z.string().optional(),
  })
)

export const Route = createFileRoute('/')({
  validateSearch: homeSearchSchema,
  component: LandingPage,
})

function publishedJobFiltersFromHomeSearch (
  s: z.infer<typeof homeSearchSchema>
): PublishedJobsFilters {
  const { setup: _setup, ...filters } = s
  return filters
}

function LandingPage () {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const { setup } = search
  const jobFilters = publishedJobFiltersFromHomeSearch(search)

  const jobsQuery = useQuery({
    queryKey: ['public-jobs', 'home', jobFilters],
    queryFn: () => fetchPublishedJobs(jobFilters),
  })
  const homeJobs = jobsQuery.data ?? []
  const filtersActive = hasActivePublishedJobFilters(search)

  return (
    <div className='flex min-h-svh flex-col bg-background'>
      <PublicSiteHeader jobsSearchFallback={jobFilters} />
      <main
        id='main-content'
        className='mx-auto flex w-full max-w-5xl flex-1 flex-col gap-16 px-4 py-16'
      >
        {setup === 'supabase' && (
          <Alert variant='destructive'>
            <AlertTitle>Supabase required</AlertTitle>
            <AlertDescription>
              Add <code className='text-xs'>VITE_SUPABASE_URL</code> and{' '}
              <code className='text-xs'>VITE_SUPABASE_ANON_KEY</code> to your environment, then
              reload.
            </AlertDescription>
          </Alert>
        )}
        <section className='max-w-2xl space-y-6'>
          <p className='text-sm font-medium text-muted-foreground'>
            ServiceNow talent network
          </p>
          <h1 className='text-4xl font-semibold tracking-tight md:text-5xl'>
            The hiring layer for the ServiceNow ecosystem.
          </h1>
          <p className='text-lg text-muted-foreground'>
            Focused roles for developers, architects, consultants, and admins.
            Paid listings for partners and enterprise teams—no generic noise.
          </p>
          <div className='flex flex-wrap gap-3'>
            <Button asChild size='lg'>
              <Link to='/jobs' search={jobFilters}>
                Browse jobs
                <ArrowRight className='ms-1 size-4' />
              </Link>
            </Button>
            <Button asChild variant='outline' size='lg'>
              <Link to='/sign-up'>I&apos;m hiring</Link>
            </Button>
          </div>
        </section>

        <section className='w-full space-y-4'>
          <div className='flex flex-wrap items-end justify-between gap-4'>
            <div>
              <h2 className='text-2xl font-semibold tracking-tight'>Open roles</h2>
              <p className='text-sm text-muted-foreground'>
                Filter by role, experience, location, and more. Open the full jobs page anytime
                without losing your filters.
              </p>
            </div>
            <Button asChild variant='outline' size='sm'>
              <Link to='/jobs' search={jobFilters}>
                Full jobs page
                <ArrowRight className='ms-1 size-4' />
              </Link>
            </Button>
          </div>

          <PublishedJobsFiltersBar search={search} navigate={navigate} />

          {jobsQuery.isLoading && <PublicJobListSkeleton />}
          {jobsQuery.isError && (
            <p className='text-sm text-destructive'>
              Could not load jobs. Configure Supabase or try again later.
            </p>
          )}
          <div className='grid gap-4'>
            {homeJobs.map((job) => (
              <PublicJobCard key={job.id} job={job} />
            ))}
          </div>
          {!jobsQuery.isLoading && homeJobs.length === 0 && (
            <div className='rounded-xl border border-dashed bg-muted/20 px-6 py-8 text-center'>
              <p className='text-sm text-muted-foreground'>
                No jobs match these filters yet. Post a listing or check back soon.
              </p>
              {filtersActive && (
                <Button
                  type='button'
                  variant='link'
                  className='mt-2 h-auto p-0 text-foreground'
                  onClick={() => {
                    void navigate({
                      search: (prev) => clearPublishedJobSearchPreserveSetup(prev),
                    })
                  }}
                >
                  Clear filters and show all roles
                </Button>
              )}
            </div>
          )}
        </section>

        <section className='grid gap-6 md:grid-cols-3'>
          <div className='rounded-xl border bg-card p-6'>
            <Briefcase className='mb-3 size-8 text-primary' />
            <h2 className='font-medium'>Relevant only</h2>
            <p className='mt-2 text-sm text-muted-foreground'>
              Filters tuned for ServiceNow roles, locations, and engagement
              models.
            </p>
          </div>
          <div className='rounded-xl border bg-card p-6'>
            <Shield className='mb-3 size-8 text-primary' />
            <h2 className='font-medium'>Trusted listings</h2>
            <p className='mt-2 text-sm text-muted-foreground'>
              Featured placements and moderated ingestion keep quality high.
            </p>
          </div>
          <div className='rounded-xl border bg-card p-6'>
            <LineChart className='mb-3 size-8 text-primary' />
            <h2 className='font-medium'>Built for scale</h2>
            <p className='mt-2 text-sm text-muted-foreground'>
              SEO-first job pages, sitemaps, and structured data for organic
              growth.
            </p>
          </div>
        </section>
      </main>
      <PublicSiteFooter />
    </div>
  )
}
