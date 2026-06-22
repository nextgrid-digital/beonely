import { useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
} from '@tanstack/react-query'
import {
  createFileRoute,
  isRedirect,
  Link,
  redirect,
  useNavigate,
} from '@tanstack/react-router'
import { publishedJobsFilterSchema } from '@/lib/jobs/fetch-published-jobs'
import {
  fetchPublicJobsCount,
  fetchPublicJobsPage,
  PUBLIC_FEED_PAGE_SIZE,
} from '@/lib/jobs/fetch-public-jobs-feed'
import type { PublishedJobsFilters } from '@/lib/jobs/published-jobs-query'
import { currentPathWithSearch } from '@/lib/auth/redirect-path'
import {
  getSupabaseBrowserClient,
  getSupabaseConfigured,
} from '@/lib/supabase/client'
import type { JobRow } from '@/lib/supabase/database.types'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { InboxList } from '@/components/inbox/inbox-list'
import type { InboxRowData } from '@/components/inbox/inbox-list-row'
import { CompanyLogoAvatar } from '@/features/jobs/company-logo-avatar'
import { JobPeek, JOB_PEEK_PARAM } from '@/features/jobs/job-peek'
import { jobPublicPills } from '@/features/jobs/job-inbox-row'
import {
  PublicSiteFooter,
  PublicSiteHeader,
  PUBLIC_SITE_MAIN_COLUMN,
} from '@/features/jobs/public-site-layout'
import {
  PublishedJobsActiveFilters,
  PublishedJobsFiltersButton,
} from '@/features/jobs/published-jobs-filters'

const homeSearchSchema = publishedJobsFilterSchema.merge(
  z.object({
    setup: z.string().optional(),
    tab: z.enum(['all', 'featured']).optional().catch(undefined),
    // Retained (optional) so the shared filters drawer's navigate typing stays compatible.
    page: z.coerce.number().int().min(1).optional().catch(undefined),
    linkedinPage: z.coerce.number().int().min(1).optional().catch(undefined),
    peek: z.string().optional(),
  })
)

type HomeTab = 'all' | 'featured'

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
  const {
    setup: _setup,
    tab: _tab,
    page: _page,
    linkedinPage: _linkedinPage,
    peek: _peek,
    ...filters
  } = s
  return filters
}

function jobToRow(job: JobRow): InboxRowData {
  return {
    id: job.job_slug,
    leading: (
      <CompanyLogoAvatar
        companyName={job.company_name}
        logoUrl={job.company_logo}
        className='size-6 rounded-[5px]'
      />
    ),
    title: job.company_name,
    preview: job.job_title,
    pills: jobPublicPills(job),
    timestamp: job.created_at ?? undefined,
  }
}

function LandingPage() {
  return <LandingPageContent />
}

function LandingPageContent() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const { setup, peek } = search
  const activeTab: HomeTab = search.tab ?? 'all'
  const jobFilters = publishedJobFiltersFromHomeSearch(search)

  const [localQ, setLocalQ] = useState(search.q ?? '')
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync URL -> input
    setLocalQ(search.q ?? '')
  }, [search.q])
  useEffect(() => {
    const t = window.setTimeout(() => {
      const next = localQ.trim() || undefined
      if (next !== search.q) {
        void navigate({
          search: (p) => ({ ...p, q: next }),
          resetScroll: false,
        })
      }
    }, 400)
    return () => window.clearTimeout(t)
  }, [localQ, navigate, search.q])

  const featuredOnly = activeTab === 'featured'

  const feedQuery = useInfiniteQuery({
    queryKey: ['public-jobs', 'feed', jobFilters, activeTab],
    queryFn: ({ pageParam }) =>
      fetchPublicJobsPage(jobFilters, {
        offset: pageParam,
        limit: PUBLIC_FEED_PAGE_SIZE,
        featuredOnly,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, page) => sum + page.rows.length, 0)
      return loaded < lastPage.total ? loaded : undefined
    },
    placeholderData: keepPreviousData,
  })

  const allCountQuery = useQuery({
    queryKey: ['public-jobs', 'count', 'all', jobFilters],
    queryFn: () => fetchPublicJobsCount(jobFilters),
    placeholderData: keepPreviousData,
  })
  const featuredCountQuery = useQuery({
    queryKey: ['public-jobs', 'count', 'featured', jobFilters],
    queryFn: () => fetchPublicJobsCount(jobFilters, { featuredOnly: true }),
    placeholderData: keepPreviousData,
  })

  const counts = useMemo(
    () => ({
      all: allCountQuery.data ?? 0,
      featured: featuredCountQuery.data ?? 0,
    }),
    [allCountQuery.data, featuredCountQuery.data]
  )

  const rows = useMemo(
    () => feedQuery.data?.pages.flatMap((page) => page.rows.map(jobToRow)) ?? [],
    [feedQuery.data]
  )
  const currentRedirect = currentPathWithSearch()

  const isLoading = feedQuery.isLoading
  const refetching = feedQuery.isFetching && !feedQuery.isFetchingNextPage
  const isError = feedQuery.isError

  return (
    <div className='flex min-h-svh min-w-0 flex-col overflow-x-clip bg-background'>
      <PublicSiteHeader />
      <div className='flex min-w-0 flex-1 flex-col pt-14'>
        <main
          id='main-content'
          className={`${PUBLIC_SITE_MAIN_COLUMN} flex min-w-0 flex-1 flex-col gap-8 overflow-x-clip py-8 sm:py-10`}
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
              Paid listings and concierge hiring support for partners and enterprise
              teams—no generic noise.
            </p>
            <div className='flex flex-col gap-3 sm:flex-row'>
              <Button asChild size='lg' className='sm:w-auto'>
                <Link to='/hire'>Hire ServiceNow talent</Link>
              </Button>
              <Button asChild size='lg' variant='outline' className='sm:w-auto'>
                <Link
                  to='/apply/sign-up'
                  search={currentRedirect ? { redirect: currentRedirect } : {}}
                >
                  Join as candidate
                </Link>
              </Button>
            </div>
          </section>

          <div className='min-w-0'>
            {isError ? (
              <p className='px-4 py-12 text-center text-sm text-destructive'>
                Could not load jobs. Configure Supabase or try again later.
              </p>
            ) : (
              <InboxList<HomeTab>
                className='h-auto'
                stickyTopClassName='top-14'
                search={localQ}
                onSearchChange={setLocalQ}
                searchPlaceholder='Search roles or companies...'
                pills={
                  counts.featured > 0
                    ? [
                        { id: 'all', label: 'All', count: counts.all },
                        {
                          id: 'featured',
                          label: 'Featured',
                          count: counts.featured,
                        },
                      ]
                    : [{ id: 'all', label: 'All', count: counts.all }]
                }
                activeFilter={activeTab}
                onFilterChange={(tab) =>
                  void navigate({
                    search: (p) => ({
                      ...p,
                      tab: tab === 'all' ? undefined : tab,
                    }),
                    resetScroll: false,
                  })
                }
                layoutId='home-jobs'
                pillsTrailing={
                  <div className='flex items-center gap-1.5'>
                    <PublishedJobsActiveFilters
                      search={search}
                      navigate={navigate}
                    />
                    <PublishedJobsFiltersButton
                      search={search}
                      navigate={navigate}
                    />
                  </div>
                }
                rows={rows}
                selectedId={peek ?? null}
                onSelect={(slug) =>
                  void navigate({
                    search: (p) => ({ ...p, [JOB_PEEK_PARAM]: slug }),
                    resetScroll: false,
                  })
                }
                loading={isLoading}
                busy={refetching}
                hasMore={feedQuery.hasNextPage}
                onLoadMore={() => void feedQuery.fetchNextPage()}
                loadingMore={feedQuery.isFetchingNextPage}
                emptyMessage='No roles match these filters yet.'
              />
            )}
          </div>
        </main>
      </div>
      <PublicSiteFooter />
      <JobPeek />
    </div>
  )
}
