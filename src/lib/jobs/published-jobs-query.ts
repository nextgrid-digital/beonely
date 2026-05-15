import { z } from 'zod'
import type { JobRow } from '@/lib/supabase/database.types'

export const publishedJobsFilterSchema = z.object({
  q: z.string().optional(),
  role: z.string().optional(),
  experience: z.string().optional(),
  work: z.string().optional(),
  location: z.string().optional(),
  type: z.string().optional(),
  org: z.string().optional(),
})

export type PublishedJobsFilters = z.infer<typeof publishedJobsFilterSchema>

export function experienceFilterValue(
  raw: string | undefined
): string | undefined {
  if (!raw) return undefined
  if (raw === 'junior') return 'entry'
  return raw
}

/** Drop listings past `listing_expires_at`. */
export function filterNonExpiredJobs(rows: JobRow[]): JobRow[] {
  const now = Date.now()
  return rows.filter(
    (j) =>
      !j.listing_expires_at || new Date(j.listing_expires_at).getTime() > now
  )
}

type FilterableJobsQuery = {
  or: (filters: string) => FilterableJobsQuery
  eq: (column: string, value: string) => FilterableJobsQuery
  ilike: (column: string, pattern: string) => FilterableJobsQuery
}

export function applyPublishedJobFilters<Q extends FilterableJobsQuery>(
  q: Q,
  filters: PublishedJobsFilters
): Q {
  let query: FilterableJobsQuery = q
  if (filters.q) {
    const safe = filters.q.replace(/%/g, '\\%').replace(/_/g, '\\_')
    query = query.or(`job_title.ilike.%${safe}%,company_name.ilike.%${safe}%`)
  }
  if (filters.role) {
    query = query.eq('job_type', filters.role)
  }
  const exp = experienceFilterValue(filters.experience)
  if (exp) {
    query = query.eq('experience_level', exp)
  }
  if (filters.work) {
    query = query.eq('work_mode', filters.work)
  }
  if (filters.type) {
    query = query.eq('employment_type', filters.type)
  }
  if (filters.location) {
    query = query.ilike('location', `%${filters.location}%`)
  }
  return query as Q
}
