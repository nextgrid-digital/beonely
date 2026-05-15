import { useQuery } from '@tanstack/react-query'
import { fetchScrapedJobs } from '@/lib/jobs/fetch-scraped-jobs'
import type { PublishedJobsFilters } from '@/lib/jobs/published-jobs-query'
import { Button } from '@/components/ui/button'
import { PublicJobListSkeleton } from '@/features/jobs/public-job-list-skeleton'
import { ScrapedJobCard } from '@/features/scraped-jobs/scraped-job-card'

export function ScrapedJobsSection({
  filters,
  filtersActive,
  onClearFilters,
}: {
  filters: PublishedJobsFilters
  filtersActive: boolean
  onClearFilters: () => void
}) {
  const scrapedQuery = useQuery({
    queryKey: ['public-jobs', 'scraped', filters],
    queryFn: () => fetchScrapedJobs(filters),
  })
  const scrapedJobs = scrapedQuery.data ?? []

  return (
    <section
      id='linkedin-roles'
      className='w-full scroll-mt-28 space-y-4 sm:scroll-mt-32'
      aria-labelledby='linkedin-roles-heading'
    >
      <div className='space-y-1'>
        <h2 id='linkedin-roles-heading' className='text-xl font-semibold'>
          Roles from LinkedIn
        </h2>
        <p className='text-sm text-muted-foreground'>
          Aggregated ServiceNow listings sourced from LinkedIn. Apply on LinkedIn
          (opens in a new tab).
        </p>
      </div>

      {scrapedQuery.isLoading && <PublicJobListSkeleton count={3} />}
      {scrapedQuery.isError && (
        <p className='text-sm text-destructive'>
          Could not load LinkedIn roles. Try again later.
        </p>
      )}
      <div className='grid gap-4'>
        {scrapedJobs.map((job) => (
          <ScrapedJobCard key={job.id} job={job} />
        ))}
      </div>
      {!scrapedQuery.isLoading && scrapedJobs.length === 0 && (
        <div className='rounded-xl border border-dashed bg-muted/20 px-6 py-8 text-center'>
          <p className='text-sm text-muted-foreground'>
            No LinkedIn roles match these filters yet. Check back after the next
            ingest run.
          </p>
          {filtersActive && (
            <Button
              type='button'
              variant='link'
              className='mt-2 h-auto p-0 text-foreground'
              onClick={onClearFilters}
            >
              Clear filters and show all roles
            </Button>
          )}
        </div>
      )}
    </section>
  )
}
