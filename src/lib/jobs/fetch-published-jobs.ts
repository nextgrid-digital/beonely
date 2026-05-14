import { z } from 'zod'
import {
  getSupabaseBrowserClient,
  getSupabaseConfigured,
} from '@/lib/supabase/client'
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

function experienceFilterValue(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  if (raw === 'junior') return 'entry'
  return raw
}

/** Listed jobs: paid + approved and not past `listing_expires_at`. */
export async function fetchPublishedJobs(
  filters: PublishedJobsFilters
): Promise<JobRow[]> {
  if (!getSupabaseConfigured()) {
    return []
  }
  const sb = getSupabaseBrowserClient()
  let q = sb
    .from('jobs')
    .select('*')
    .eq('approval_status', 'approved')
    .eq('payment_status', 'paid')
    .order('featured', { ascending: false })
    .order('created_at', { ascending: false })

  if (filters.q) {
    const safe = filters.q.replace(/%/g, '\\%').replace(/_/g, '\\_')
    q = q.or(`job_title.ilike.%${safe}%,company_name.ilike.%${safe}%`)
  }
  if (filters.role) {
    q = q.eq('job_type', filters.role)
  }
  const exp = experienceFilterValue(filters.experience)
  if (exp) {
    q = q.eq('experience_level', exp)
  }
  if (filters.work) {
    q = q.eq('work_mode', filters.work)
  }
  if (filters.type) {
    q = q.eq('employment_type', filters.type)
  }
  if (filters.org) {
    // Live schema has no org_type — filter is ignored.
  }
  if (filters.location) {
    q = q.ilike('location', `%${filters.location}%`)
  }

  const { data, error } = await q
  if (error) throw error
  const rows = (data ?? []) as JobRow[]
  const now = Date.now()
  return rows.filter(
    (j) =>
      !j.listing_expires_at || new Date(j.listing_expires_at).getTime() > now
  )
}
