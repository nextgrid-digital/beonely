import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import {
  Link,
  createFileRoute,
  isRedirect,
  redirect,
  useNavigate,
} from '@tanstack/react-router'
import {
  Briefcase,
  ChevronLeft,
  ChevronRight,
  LineChart,
  Shield,
} from 'lucide-react'
import {
  fetchRecruiterPublishedJobs,
  publishedJobsFilterSchema,
} from '@/lib/jobs/fetch-published-jobs'
import type { PublishedJobsFilters } from '@/lib/jobs/published-jobs-query'
import {
  getSupabaseBrowserClient,
  getSupabaseConfigured,
} from '@/lib/supabase/client'
import { getPageNumbers } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { PublicJobCard } from '@/features/jobs/public-job-card'
import { PublicJobListSkeleton } from '@/features/jobs/public-job-list-skeleton'
import {
  PublicSiteFooter,
  PublicSiteHeader,
  PUBLIC_SITE_MAIN_COLUMN,
} from '@/features/jobs/public-site-layout'
import {
  PublishedJobsFiltersBar,
  clearPublishedJobSearchPreserveSetup,
  hasActivePublishedJobFilters,
} from '@/features/jobs/published-jobs-filters'
import { ScrapedJobsSection } from '@/features/scraped-jobs'

const homeSearchSchema = publishedJobsFilterSchema.merge(
  z.object({
    setup: z.string().optional(),
    page: z.coerce.number().int().min(1).optional().catch(undefined),
  })
)

const HOME_JOBS_PAGE_SIZE = 6

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
  const { setup: _setup, page: _page, ...filters } = s
  return filters
}

function LandingPage() {
  return <LandingPageContent />
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
  const totalPages = Math.max(
    1,
    Math.ceil(homeJobs.length / HOME_JOBS_PAGE_SIZE)
  )
  const currentPage = Math.min(Math.max(search.page ?? 1, 1), totalPages)
  const paginatedHomeJobs = homeJobs.slice(
    (currentPage - 1) * HOME_JOBS_PAGE_SIZE,
    currentPage * HOME_JOBS_PAGE_SIZE
  )

  const goToPage = (page: number) => {
    const nextPage = Math.min(Math.max(page, 1), totalPages)
    void navigate({
      search: (prev) => ({
        ...prev,
        page: nextPage === 1 ? undefined : nextPage,
      }),
    })
  }

  return (
    <div className='flex min-h-svh min-w-0 flex-col overflow-x-clip bg-background'>
      <PublicSiteHeader />
      <div className='flex min-w-0 flex-1 flex-col pt-14'>
        <main
          id='main-content'
          className={`${PUBLIC_SITE_MAIN_COLUMN} flex min-w-0 flex-1 flex-col gap-12 overflow-x-clip py-8 sm:gap-14 sm:py-10 md:gap-16 md:py-12`}
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
            <h1 className='text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl'>
              ServiceNow Careers,
              <br />
              Curated.
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
              {paginatedHomeJobs.map((job) => (
                <PublicJobCard key={job.id} job={job} />
              ))}
            </div>
            {!jobsQuery.isLoading && homeJobs.length > HOME_JOBS_PAGE_SIZE && (
              <PublicJobsPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalJobs={homeJobs.length}
                pageSize={HOME_JOBS_PAGE_SIZE}
                onPageChange={goToPage}
              />
            )}
            {!jobsQuery.isLoading && homeJobs.length === 0 && (
              <div className='rounded-xl border border-dashed bg-muted/20 px-6 py-8 text-center'>
                <p className='text-sm text-muted-foreground'>
                  {filtersActive ? (
                    'No jobs match these filters yet.'
                  ) : (
                    <>
                      No recruiter has posted a job yet. If you are a recruiter,{' '}
                      <Link
                        to='/hire/sign-up'
                        className='font-medium text-foreground underline underline-offset-4 hover:text-foreground/90 focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
                      >
                        sign up as a recruiter
                      </Link>{' '}
                      and post the role you are hiring for.
                    </>
                  )}
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

function PublicJobsPagination(props: {
  currentPage: number
  totalPages: number
  totalJobs: number
  pageSize: number
  onPageChange: (page: number) => void
}) {
  const { currentPage, totalPages, totalJobs, pageSize, onPageChange } = props
  const pageNumbers = getPageNumbers(currentPage, totalPages)
  const start = (currentPage - 1) * pageSize + 1
  const end = Math.min(currentPage * pageSize, totalJobs)

  return (
    <nav
      aria-label='Published jobs pagination'
      className='flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between'
    >
      <p className='text-sm text-muted-foreground'>
        Showing {start}-{end} of {totalJobs} roles
      </p>
      <div className='flex flex-wrap items-center gap-2'>
        <Button
          type='button'
          variant='outline'
          size='icon'
          className='size-9'
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <span className='sr-only'>Go to previous page</span>
          <ChevronLeft className='size-4' aria-hidden />
        </Button>
        {pageNumbers.map((pageNumber, index) => {
          if (pageNumber === '...') {
            return (
              <span
                key={`ellipsis-${index}`}
                className='px-1 text-sm text-muted-foreground'
                aria-hidden
              >
                ...
              </span>
            )
          }
          const page = Number(pageNumber)
          return (
            <Button
              key={page}
              type='button'
              variant={page === currentPage ? 'default' : 'outline'}
              className='h-9 min-w-9 px-3'
              onClick={() => onPageChange(page)}
              aria-current={page === currentPage ? 'page' : undefined}
            >
              <span className='sr-only'>Go to page </span>
              {page}
            </Button>
          )
        })}
        <Button
          type='button'
          variant='outline'
          size='icon'
          className='size-9'
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <span className='sr-only'>Go to next page</span>
          <ChevronRight className='size-4' aria-hidden />
        </Button>
      </div>
    </nav>
  )
}
