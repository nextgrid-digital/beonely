import { useQuery } from '@tanstack/react-query'
import { fetchScrapedJobs } from '@/lib/jobs/fetch-scraped-jobs'
import type { PublishedJobsFilters } from '@/lib/jobs/published-jobs-query'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { PublicJobListSkeleton } from '@/features/jobs/public-job-list-skeleton'
import { PublicJobsPagination } from '@/features/jobs/public-jobs-pagination'
import { ScrapedJobCard } from '@/features/scraped-jobs/scraped-job-card'

export function ScrapedJobsSection({
  filters,
  filtersActive,
  page,
  pageSize,
  onPageChange,
  onClearFilters,
  showTopDivider = true,
}: {
  filters: PublishedJobsFilters
  filtersActive: boolean
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onClearFilters: () => void
  /** Hide the leading divider when no roles render above this section. */
  showTopDivider?: boolean
}) {
  const scrapedQuery = useQuery({
    queryKey: ['public-jobs', 'scraped', filters],
    queryFn: () => fetchScrapedJobs(filters),
  })
  const scrapedJobs = scrapedQuery.data ?? []
  const totalPages = Math.max(1, Math.ceil(scrapedJobs.length / pageSize))
  const currentPage = Math.min(Math.max(page, 1), totalPages)
  const paginatedScrapedJobs = scrapedJobs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )
  const isEmptyWithoutFilters =
    !scrapedQuery.isLoading &&
    !scrapedQuery.isError &&
    scrapedJobs.length === 0 &&
    !filtersActive

  return (
    <section
      id='linkedin-roles'
      className='w-full scroll-mt-28 space-y-4 sm:scroll-mt-32'
      aria-label='LinkedIn roles'
    >
      {showTopDivider && !isEmptyWithoutFilters && (
        <Separator className='my-2' />
      )}

      {scrapedQuery.isLoading && <PublicJobListSkeleton count={3} />}
      {scrapedQuery.isError && (
        <p className='text-sm text-destructive'>
          Could not load LinkedIn roles. Try again later.
        </p>
      )}
      <div className='grid gap-4'>
        {paginatedScrapedJobs.map((job) => (
          <ScrapedJobCard key={job.id} job={job} />
        ))}
      </div>
      {!scrapedQuery.isLoading && scrapedJobs.length > pageSize && (
        <PublicJobsPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalJobs={scrapedJobs.length}
          pageSize={pageSize}
          onPageChange={onPageChange}
        />
      )}
      {!scrapedQuery.isLoading && scrapedJobs.length === 0 && filtersActive && (
        <div className='rounded-xl border border-dashed bg-muted/20 px-6 py-8 text-center'>
          <p className='text-sm text-muted-foreground'>
            No LinkedIn roles match these filters yet.
          </p>
          <Button
            type='button'
            variant='link'
            className='mt-2 h-auto p-0 text-foreground'
            onClick={onClearFilters}
          >
            Clear filters and show all roles
          </Button>
        </div>
      )}
    </section>
  )
}
