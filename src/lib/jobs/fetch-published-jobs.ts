import {
  applyPublishedJobFilters,
  filterNonExpiredJobs,
  publishedJobsFilterSchema,
  type PublishedJobsFilters,
} from '@/lib/jobs/published-jobs-query'
import { sortPublishedJobsForFeed } from '@/lib/jobs/sort-published-jobs'
import {
  getSupabaseBrowserClient,
  getSupabaseConfigured,
} from '@/lib/supabase/client'
import type { JobRow } from '@/lib/supabase/database.types'

export { publishedJobsFilterSchema, type PublishedJobsFilters }

/** Recruiter-paid Beonely listings: approved, paid, active. */
export async function fetchRecruiterPublishedJobs(
  filters: PublishedJobsFilters
): Promise<JobRow[]> {
  if (!getSupabaseConfigured()) {
    return []
  }
  const sb = getSupabaseBrowserClient()
  let q = sb
    .from('public_jobs')
    .select('*')
    .eq('source_kind', 'recruiter_posted')
    .eq('approval_status', 'approved')
    .eq('payment_status', 'paid')
    .order('featured', { ascending: false })
    .order('created_at', { ascending: false })

  q = applyPublishedJobFilters(q, filters)

  const { data, error } = await q
  if (error) throw error
  const active = filterNonExpiredJobs((data ?? []) as JobRow[])
  return sortPublishedJobsForFeed(active)
}

/** @deprecated Use {@link fetchRecruiterPublishedJobs} */
export const fetchPublishedJobs = fetchRecruiterPublishedJobs
