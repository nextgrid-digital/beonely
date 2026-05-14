import type { JobRow } from '@/lib/supabase/database.types'

function sourceRank(job: JobRow): number {
  return job.source_kind === 'recruiter_posted' ? 0 : 1
}

function tierRank(job: JobRow): number {
  return job.listing_tier === 'featured' ? 0 : 1
}

/**
 * Public job feed: recruiter-posted listings first, then scraped/imported.
 * Within each group: featured tier and `featured` flag first, then newest.
 */
export function sortPublishedJobsForFeed(rows: JobRow[]): JobRow[] {
  return [...rows].sort((a, b) => {
    const s = sourceRank(a) - sourceRank(b)
    if (s !== 0) return s
    const f = Number(b.featured) - Number(a.featured)
    if (f !== 0) return f
    const t = tierRank(a) - tierRank(b)
    if (t !== 0) return t
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}
