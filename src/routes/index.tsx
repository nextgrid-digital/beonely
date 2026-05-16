import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import {
  createFileRoute,
  isRedirect,
  redirect,
  useNavigate,
} from '@tanstack/react-router'
import { Briefcase, LineChart, Shield } from 'lucide-react'
import {
  fetchRecruiterPublishedJobs,
  publishedJobsFilterSchema,
} from '@/lib/jobs/fetch-published-jobs'
import type { PublishedJobsFilters } from '@/lib/jobs/published-jobs-query'
import { ScrapedJobsSection } from '@/features/scraped-jobs'
import {
  getSupabaseBrowserClient,
  getSupabaseConfigured,
} from '@/lib/supabase/client'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { PublicJobCard } from '@/features/jobs/public-job-card'
import { PublicJobListSkeleton } from '@/features/jobs/public-job-list-skeleton'
import {
  PublicSiteAuthShell,
  PublicSiteFooter,
  PublicSiteHeader,
  PUBLIC_SITE_MAIN_COLUMN,
} from '@/features/jobs/public-site-layout'
import {
  PublishedJobsFiltersBar,
  clearPublishedJobSearchPreserveSetup,
  hasActivePublishedJobFilters,
} from '@/features/jobs/published-jobs-filters'

const homeSearchSchema = publishedJobsFilterSchema.merge(
  z.object({
    setup: z.string().optional(),
  })
)

export const Route = createFileRoute('/')({
  validateSearch: homeSearchSchema,
  beforeLoad: async () => {
    if (!getSupabaseConfigured()) return
    try {
      const supabase = getSupabaseBrowserClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const uid = session?.user?.id
      if (!uid) return
      const { data: rec } = await supabase
        .from('recruiters')
        .select('user_id, role')
        .eq('user_id', uid)
        .maybeSingle()
      if (rec) {
        if (rec.role === 'admin') {
          throw redirect({ to: '/admin' })
        }
        throw redirect({ to: '/recruiter' })
      }
    } catch (e) {
      if (isRedirect(e)) throw e
      return
    }
  },
  component: LandingPage,
})

function publishedJobFiltersFromHomeSearch(
  s: z.infer<typeof homeSearchSchema>
): PublishedJobsFilters {
  const { setup: _setup, ...filters } = s
  return filters
}

function LandingPage() {
  return (
    <PublicSiteAuthShell>
      <LandingPageContent />
    </PublicSiteAuthShell>
  )
}

function LandingPageContent() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const { setup } = search
  const jobFilters = publishedJobFiltersFromHomeSearch(search)

  const jobsQuery = useQuery({
    queryKey: ['public-jobs', 'recruiter', jobFilters],
    queryFn: () => fetchRecruiterPublishedJobs(jobFilters),
  })
  const homeJobs = jobsQuery.data ?? []
  const filtersActive = hasActivePublishedJobFilters(search)

  return (
    <div className='flex min-h-svh flex-col bg-background'>
      <PublicSiteHeader />
      <div className='flex flex-1 flex-col pt-14'>
        <main
          id='main-content'
          className={`${PUBLIC_SITE_MAIN_COLUMN} flex flex-1 flex-col gap-12 py-8 sm:gap-14 sm:py-10 md:gap-16 md:py-12`}
        >
          {setup === 'supabase' && (
            <Alert variant='destructive'>
              <AlertTitle>Supabase required</AlertTitle>
              <AlertDescription>
                Add <code className='text-xs'>VITE_SUPABASE_URL</code> and{' '}
                <code className='text-xs'>VITE_SUPABASE_ANON_KEY</code> to your
                environment, then reload.
              </AlertDescription>
            </Alert>
          )}
          <section className='max-w-2xl space-y-5 sm:space-y-6'>
            <p className='text-sm font-medium text-muted-foreground'>
              ServiceNow talent network
            </p>
            <h1 className='text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl'>
              The hiring layer for the ServiceNow ecosystem.
            </h1>
            <p className='text-base text-muted-foreground sm:text-lg'>
              Focused roles for developers, architects, consultants, and admins.
              Paid listings for partners and enterprise teams—no generic noise.
            </p>
          </section>

          <section
            id='open-roles'
            className='w-full scroll-mt-28 space-y-4 sm:scroll-mt-32'
          >
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
                  No jobs match these filters yet. Post a listing or check back
                  soon.
                </p>
                {filtersActive && (
                  <Button
                    type='button'
                    variant='link'
                    className='mt-2 h-auto p-0 text-foreground'
                    onClick={() => {
                      void navigate({
                        search: (prev) =>
                          clearPublishedJobSearchPreserveSetup(prev),
                      })
                    }}
                  >
                    Clear filters and show all roles
                  </Button>
                )}
              </div>
            )}
          </section>

          <ScrapedJobsSection
            filters={jobFilters}
            filtersActive={filtersActive}
            onClearFilters={() => {
              void navigate({
                search: (prev) => clearPublishedJobSearchPreserveSetup(prev),
              })
            }}
          />

          <section className='grid gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3'>
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
      </div>
      <PublicSiteFooter />
    </div>
  )
}
