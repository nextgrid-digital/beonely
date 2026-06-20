import { useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  createFileRoute,
  isRedirect,
  redirect,
  useNavigate,
} from '@tanstack/react-router'
import {
  fetchRecruiterPublishedJobs,
  publishedJobsFilterSchema,
} from '@/lib/jobs/fetch-published-jobs'
import { fetchScrapedJobs } from '@/lib/jobs/fetch-scraped-jobs'
import type { PublishedJobsFilters } from '@/lib/jobs/published-jobs-query'
import {
  getSupabaseBrowserClient,
  getSupabaseConfigured,
} from '@/lib/supabase/client'
import type { JobRow } from '@/lib/supabase/database.types'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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

  const recruiterQuery = useQuery({
    queryKey: ['public-jobs', 'recruiter', jobFilters],
    queryFn: () => fetchRecruiterPublishedJobs(jobFilters),
    placeholderData: keepPreviousData,
  })
  const scrapedQuery = useQuery({
    queryKey: ['public-jobs', 'scraped', jobFilters],
    queryFn: () => fetchScrapedJobs(jobFilters),
    placeholderData: keepPreviousData,
  })

  const recruiterJobs = useMemo(
    () => recruiterQuery.data ?? [],
    [recruiterQuery.data]
  )
  const scrapedJobs = useMemo(
    () => scrapedQuery.data ?? [],
    [scrapedQuery.data]
  )

  const allJobs = useMemo(
    () => [...recruiterJobs, ...scrapedJobs],
    [recruiterJobs, scrapedJobs]
  )

  const counts = useMemo(
    () => ({
      all: allJobs.length,
      featured: allJobs.filter((j) => j.featured).length,
    }),
    [allJobs]
  )

  const visibleJobs = useMemo(() => {
    switch (activeTab) {
      case 'featured':
        return allJobs.filter((j) => j.featured)
      case 'all':
        return allJobs
      default: {
        const _exhaustive: never = activeTab
        return _exhaustive
      }
    }
  }, [activeTab, allJobs])

  const rows = useMemo(() => visibleJobs.map(jobToRow), [visibleJobs])

  const isLoading = recruiterQuery.isLoading || scrapedQuery.isLoading
  const refetching = recruiterQuery.isFetching || scrapedQuery.isFetching
  const isError = recruiterQuery.isError && scrapedQuery.isError

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
              Paid listings for partners and enterprise teams—no generic noise.
            </p>
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
