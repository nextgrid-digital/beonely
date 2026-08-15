import type { JobRow } from '@/lib/supabase/database.types'

/** Days before expiry when extend is offered. */
export const RENEWAL_WINDOW_DAYS_BEFORE_EXPIRY = 7

/** Days after expiry when reactivate is still allowed. */
export const RENEWAL_GRACE_DAYS_AFTER_EXPIRY = 30

function msPerDay() {
  return 24 * 60 * 60 * 1000
}

export function listingExpiryDate(job: JobRow): Date | null {
  if (!job.listing_expires_at) return null
  return new Date(job.listing_expires_at)
}

export function daysUntilListingExpiry(
  job: JobRow,
  now = new Date()
): number | null {
  const exp = listingExpiryDate(job)
  if (!exp) return null
  return Math.ceil((exp.getTime() - now.getTime()) / msPerDay())
}

export function daysSinceListingExpiry(
  job: JobRow,
  now = new Date()
): number | null {
  const exp = listingExpiryDate(job)
  if (!exp) return null
  const diff = now.getTime() - exp.getTime()
  if (diff <= 0) return null
  return Math.floor(diff / msPerDay())
}

/**
 * Paid + approved listing that is expiring within 7 days or expired within 30 days.
 */
export function jobListingCanRenew(job: JobRow, now = new Date()): boolean {
  if (job.approval_status !== 'approved' || job.payment_status !== 'paid') {
    return false
  }
  const exp = listingExpiryDate(job)
  if (!exp) return false

  if (exp.getTime() > now.getTime()) {
    const daysLeft = daysUntilListingExpiry(job, now)
    return daysLeft !== null && daysLeft <= RENEWAL_WINDOW_DAYS_BEFORE_EXPIRY
  }

  const daysPast = daysSinceListingExpiry(job, now)
  return daysPast !== null && daysPast <= RENEWAL_GRACE_DAYS_AFTER_EXPIRY
}

export function formatListingLiveUntil(job: JobRow): string | null {
  const exp = listingExpiryDate(job)
  if (!exp) return null
  return exp.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
