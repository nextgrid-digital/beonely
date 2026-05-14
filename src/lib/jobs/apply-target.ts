import type { JobRow } from '@/lib/supabase/database.types'

export type JobApplyTargetFields = Pick<JobRow, 'source_kind' | 'apply_url'>

/** Paid listing on Beonely — apply in-app only (no external primary). */
export function isBeonelyApplyJob(job: JobApplyTargetFields): boolean {
  return job.source_kind === 'recruiter_posted'
}

function applyUrlIsLinkedInHost(applyUrl: string): boolean {
  try {
    const u = new URL(applyUrl)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false
    const h = u.hostname.toLowerCase()
    return h === 'linkedin.com' || h === 'www.linkedin.com'
  } catch {
    return false
  }
}

/** LinkedIn-sourced listing or apply URL hosted on linkedin.com. */
export function isLinkedInApplyJob(job: JobApplyTargetFields): boolean {
  if (job.source_kind === 'linkedin_import') return true
  return applyUrlIsLinkedInHost(job.apply_url)
}

export function applyButtonLabel(job: JobApplyTargetFields): string {
  if (isBeonelyApplyJob(job)) return 'Apply with your Beonely profile'
  return isLinkedInApplyJob(job) ? 'Apply on LinkedIn' : 'Apply externally'
}

export function applyButtonAriaLabel(job: JobApplyTargetFields): string {
  if (isBeonelyApplyJob(job))
    return 'Apply with your Beonely profile (submits your profile to the employer)'
  return isLinkedInApplyJob(job)
    ? 'Apply on LinkedIn (opens in a new tab)'
    : 'Apply externally (opens in a new tab)'
}

export function showLinkedInBrand(job: JobApplyTargetFields): boolean {
  if (isBeonelyApplyJob(job)) return false
  return isLinkedInApplyJob(job)
}
