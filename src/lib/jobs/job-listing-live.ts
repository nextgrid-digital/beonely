import type { JobRow } from '@/lib/supabase/database.types'

/** Same visibility rules as public `/jobs/$slug` and recruiter **View**. */
export function jobListingIsLive(job: JobRow): boolean {
  if (job.approval_status !== 'approved' || job.payment_status !== 'paid') {
    return false
  }
  if (
    job.listing_expires_at &&
    new Date(job.listing_expires_at) <= new Date()
  ) {
    return false
  }
  return true
}
