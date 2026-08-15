import { useQuery } from '@tanstack/react-query'
import { fetchJobBySlug } from '@/lib/jobs/fetch-job-by-slug'
import { formatPostedDate } from '@/lib/jobs/format-posted-date'
import { Skeleton } from '@/components/ui/skeleton'
import { PeekPanel } from '@/components/peek/peek-panel'
import { usePeekSearch } from '@/components/peek/use-peek-search'
import {
  JobDetailApplySection,
  JobDetailView,
} from '@/features/jobs/job-detail-view'

/** Search-param key for the public job side-peek (`?peek=<job_slug>`). */
export const JOB_PEEK_PARAM = 'peek'

/**
 * Renders the public job side-peek driven by the `?peek=<slug>` URL param. Mount
 * once on a listing page; opening is done by setting the param (see `usePeekSearch`).
 */
export function JobPeek() {
  const [slug, setSlug] = usePeekSearch(JOB_PEEK_PARAM)

  const jobQuery = useQuery({
    queryKey: ['job', slug],
    queryFn: () => fetchJobBySlug(slug as string),
    enabled: Boolean(slug),
  })

  const job = jobQuery.data ?? null

  return (
    <PeekPanel
      open={Boolean(slug)}
      onOpenChange={(open) => {
        if (!open) setSlug(null)
      }}
      title={job?.job_title ?? 'Job'}
      description={
        job
          ? `${job.company_name}${job.location ? ` · ${job.location}` : ''}`
          : undefined
      }
      hideHeader
      topBar={job ? `Posted ${formatPostedDate(job.created_at)}` : null}
      topBarActions={job ? <JobDetailApplySection job={job} /> : null}
      bodyClassName='px-4 py-5 sm:px-6'
    >
      {jobQuery.isLoading ? (
        <div className='space-y-4' aria-busy='true' aria-label='Loading job'>
          <Skeleton className='h-10 w-3/4' />
          <Skeleton className='h-5 w-1/2' />
          <Skeleton className='h-40 w-full' />
        </div>
      ) : jobQuery.isError || !job ? (
        <p className='text-sm text-muted-foreground'>
          This job could not be loaded.
        </p>
      ) : (
        <JobDetailView job={job} variant='peek' />
      )}
    </PeekPanel>
  )
}
