import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { PublicJobCard } from '@/features/jobs/public-job-card'
import { PublicJobListSkeleton } from '@/features/jobs/public-job-list-skeleton'
import {
  PublishedJobsFiltersBar,
  clearPublishedJobSearchPreserveSetup,
  hasActivePublishedJobFilters,
} from '@/features/jobs/published-jobs-filters'
import {
  fetchPublishedJobs,
  publishedJobsFilterSchema,
} from '@/lib/jobs/fetch-published-jobs'

export const Route = createFileRoute('/jobs/')({
  component: JobsListPage,
  validateSearch: publishedJobsFilterSchema,
})

function JobsListPage () {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  const query = useQuery({
    queryKey: ['public-jobs', search],
    queryFn: async () => fetchPublishedJobs(search),
  })

  const jobs = query.data ?? []
  const filtersActive = hasActivePublishedJobFilters(search)

  return (
    <main
      id='main-content'
      className='mx-auto w-full max-w-5xl flex-1 space-y-8 px-4 py-16'
    >
      <div>
        <h1 className='text-3xl font-semibold tracking-tight'>ServiceNow jobs</h1>
        <p className='mt-2 text-muted-foreground'>
          Curated opportunities across partners and enterprise teams.
        </p>
      </div>

      <PublishedJobsFiltersBar search={search} navigate={navigate} />

      {query.isLoading && <PublicJobListSkeleton />}
      {query.isError && (
        <p className='text-sm text-destructive'>
          Could not load jobs. Configure Supabase or check your connection.
        </p>
      )}

      <div className='grid gap-4'>
        {jobs.map((job) => (
          <PublicJobCard key={job.id} job={job} />
        ))}
        {!query.isLoading && jobs.length === 0 && (
          <div className='rounded-xl border border-dashed bg-muted/20 px-6 py-8 text-center'>
            <p className='text-sm text-muted-foreground'>
              No jobs match these filters yet.
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
      </div>
    </main>
  )
}
