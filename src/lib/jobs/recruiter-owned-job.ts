import type { JobRow } from '@/lib/supabase/database.types'

/** Jobs created by recruiters via the portal (not admin LinkedIn ingest). */
export const RECRUITER_OWNED_JOB_SOURCE = 'recruiter_posted' as const

export function isRecruiterOwnedJob(job: Pick<JobRow, 'source_kind'>): boolean {
  return job.source_kind === RECRUITER_OWNED_JOB_SOURCE
}

export function recruiterOwnsJob(
  job: Pick<JobRow, 'source_kind' | 'recruiter_id'>,
  recruiterId: string
): boolean {
  return isRecruiterOwnedJob(job) && job.recruiter_id === recruiterId
}
