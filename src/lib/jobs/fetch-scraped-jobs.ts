import {
  getSupabaseBrowserClient,
  getSupabaseConfigured,
} from '@/lib/supabase/client'
import type { JobRow } from '@/lib/supabase/database.types'
import type { PublishedJobsFilters } from '@/lib/jobs/published-jobs-query'
import {
  applyPublishedJobFilters,
  filterNonExpiredJobs,
} from '@/lib/jobs/published-jobs-query'

/** LinkedIn-import listings: approved, paid, active, newest first. */
export async function fetchScrapedJobs(
  filters: PublishedJobsFilters
): Promise<JobRow[]> {
  if (!getSupabaseConfigured()) {
    return []
  }
  const sb = getSupabaseBrowserClient()
  let q = sb
    .from('jobs')
    .select('*')
    .eq('source_kind', 'linkedin_import')
    .eq('approval_status', 'approved')
    .eq('payment_status', 'paid')
    .order('created_at', { ascending: false })

  q = applyPublishedJobFilters(q, filters)

  const { data, error } = await q
  if (error) throw error
  return filterNonExpiredJobs((data ?? []) as JobRow[])
}
