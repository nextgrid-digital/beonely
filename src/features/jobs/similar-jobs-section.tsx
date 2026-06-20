import { useQuery } from '@tanstack/react-query'
import { fetchSimilarJobs } from '@/lib/jobs/fetch-similar-jobs'
import type { JobRow } from '@/lib/supabase/database.types'
import { usePeekSearch } from '@/components/peek/use-peek-search'
import { JOB_PEEK_PARAM } from '@/features/jobs/job-peek'
import { PublicJobCard } from '@/features/jobs/public-job-card'

export function SimilarJobsSection({ job }: { job: JobRow }) {
  const [, setPeekSlug] = usePeekSearch(JOB_PEEK_PARAM)

  // eslint-disable-next-line @tanstack/query/exhaustive-deps -- job id in queryKey is sufficient
  const similarQuery = useQuery({
    queryKey: ['similar-jobs', job.id],
    queryFn: () => fetchSimilarJobs(job),
  })

  const similar = similarQuery.data ?? []
  if (similarQuery.isLoading || similar.length === 0) return null

  return (
    <section aria-labelledby='similar-jobs-heading' className='space-y-2'>
      <h2
        id='similar-jobs-heading'
        className='text-lg font-semibold tracking-tight'
      >
        Similar jobs
      </h2>
      <div className='grid gap-0'>
        {similar.map((similarJob) => (
          <PublicJobCard
            key={similarJob.id}
            job={similarJob}
            onSelect={(selected) => setPeekSlug(selected.job_slug)}
          />
        ))}
      </div>
    </section>
  )
}
