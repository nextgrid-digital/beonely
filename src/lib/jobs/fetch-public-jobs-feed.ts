import {
  applyPublishedJobFilters,
  type PublishedJobsFilters,
} from '@/lib/jobs/published-jobs-query'
import {
  getSupabaseBrowserClient,
  getSupabaseConfigured,
} from '@/lib/supabase/client'
import type { JobRow } from '@/lib/supabase/database.types'

/**
 * Lightweight column set for list rows. Deliberately omits heavy fields like
 * `job_description` so the board's first page loads fast; the side-peek refetches
 * the full row by slug when a job is opened.
 */
const JOB_LIST_COLUMNS = [
  'id',
  'job_slug',
  'job_title',
  'company_name',
  'company_logo',
  'location',
  'created_at',
  'featured',
  'work_mode',
  'employment_type',
  'listing_expires_at',
  'listing_tier',
  'source_kind',
].join(', ')

/** Default page size for the public board feed. Tuned for a fast first paint. */
export const PUBLIC_FEED_PAGE_SIZE = 25

export interface PublicJobsPage {
  rows: JobRow[]
  /** Total rows matching the filters (across all pages). */
  total: number
}

interface FeedQueryOptions {
  offset: number
  limit: number
  featuredOnly?: boolean
}

type LivePaidQuery<Q> = {
  eq: (column: string, value: string | boolean) => Q
  in: (column: string, values: readonly string[]) => Q
  or: (filters: string) => Q
}

/** Shared "approved + paid + live (+ featured)" predicate for the public feed. */
function applyLivePaidFilters<Q extends LivePaidQuery<Q>>(
  q: Q,
  featuredOnly: boolean
): Q {
  let query = q
    .eq('approval_status', 'approved')
    .eq('payment_status', 'paid')
    .in('source_kind', ['recruiter_posted', 'linkedin_import'])
    .or(
      `listing_expires_at.is.null,listing_expires_at.gt.${new Date().toISOString()}`
    )
  if (featuredOnly) {
    query = query.eq('featured', true)
  }
  return query
}

/**
 * One page of the merged public job feed (recruiter-posted listings first, then
 * LinkedIn imports; featured first, newest first), with the total match count.
 */
export async function fetchPublicJobsPage(
  filters: PublishedJobsFilters,
  { offset, limit, featuredOnly = false }: FeedQueryOptions
): Promise<PublicJobsPage> {
  if (!getSupabaseConfigured()) {
    return { rows: [], total: 0 }
  }
  const sb = getSupabaseBrowserClient()
  let q = sb.from('public_jobs').select(JOB_LIST_COLUMNS, { count: 'exact' })
  q = applyLivePaidFilters(q, featuredOnly)
  q = applyPublishedJobFilters(q, filters)
  const { data, count, error } = await q
    .order('source_kind', { ascending: false })
    .order('featured', { ascending: false })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + limit - 1)
  if (error) throw error
  return { rows: (data ?? []) as unknown as JobRow[], total: count ?? 0 }
}

/** Cheap exact count (no rows fetched) for a tab's filter set. */
export async function fetchPublicJobsCount(
  filters: PublishedJobsFilters,
  { featuredOnly = false }: { featuredOnly?: boolean } = {}
): Promise<number> {
  if (!getSupabaseConfigured()) return 0
  const sb = getSupabaseBrowserClient()
  let q = sb
    .from('public_jobs')
    .select(JOB_LIST_COLUMNS, { count: 'exact', head: true })
  q = applyLivePaidFilters(q, featuredOnly)
  q = applyPublishedJobFilters(q, filters)
  const { count, error } = await q
  if (error) throw error
  return count ?? 0
}
