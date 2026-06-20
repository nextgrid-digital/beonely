import { jobListingIsLive } from '@/lib/jobs/job-listing-live'
import {
  getSupabaseBrowserClient,
  getSupabaseConfigured,
} from '@/lib/supabase/client'
import type { JobRow } from '@/lib/supabase/database.types'

/** Fetch a single live public job listing by its slug. Returns null when missing or not live. */
export async function fetchJobBySlug(slug: string): Promise<JobRow | null> {
  if (!getSupabaseConfigured()) return null
  const sb = getSupabaseBrowserClient()
  const { data, error } = await sb
    .from('jobs')
    .select('*')
    .eq('job_slug', slug)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const job = data as JobRow
  if (!jobListingIsLive(job)) return null
  return job
}
