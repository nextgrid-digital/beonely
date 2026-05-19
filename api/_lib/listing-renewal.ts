/** Keep in sync with `src/lib/jobs/job-listing-renewal.ts`. */

export const RENEWAL_WINDOW_DAYS_BEFORE_EXPIRY = 7
export const RENEWAL_GRACE_DAYS_AFTER_EXPIRY = 30

const MS_PER_DAY = 24 * 60 * 60 * 1000

type JobRenewSnapshot = {
  approval_status: string
  payment_status: string
  listing_expires_at: string | null
}

export function jobListingCanRenew (
  job: JobRenewSnapshot,
  now = new Date()
): boolean {
  if (job.approval_status !== 'approved' || job.payment_status !== 'paid') {
    return false
  }
  if (!job.listing_expires_at) return false

  const exp = new Date(job.listing_expires_at)
  if (exp.getTime() > now.getTime()) {
    const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / MS_PER_DAY)
    return daysLeft <= RENEWAL_WINDOW_DAYS_BEFORE_EXPIRY
  }

  const daysPast = Math.floor((now.getTime() - exp.getTime()) / MS_PER_DAY)
  return daysPast <= RENEWAL_GRACE_DAYS_AFTER_EXPIRY
}

export function addListingDays (
  listingExpiresAt: string | null,
  days: number,
  now = new Date()
): string {
  const base =
    listingExpiresAt && new Date(listingExpiresAt).getTime() > now.getTime()
      ? new Date(listingExpiresAt)
      : new Date(now)
  base.setUTCDate(base.getUTCDate() + days)
  return base.toISOString()
}
