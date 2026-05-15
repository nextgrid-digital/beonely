import type { JobRow } from '@/lib/supabase/database.types'
import { PublicJobCard } from '@/features/jobs/public-job-card'

export function ScrapedJobCard({ job }: { job: JobRow }) {
  return <PublicJobCard job={job} />
}
