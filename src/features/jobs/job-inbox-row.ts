import { formatJobEnumLabel } from '@/lib/jobs/job-enum-labels'
import { plainTextFromJobDescription } from '@/lib/jobs/sanitize-job-description-html'
import type { JobRow } from '@/lib/supabase/database.types'
import type { InboxPillItem } from '@/components/inbox/inbox-status-pill'

/** Title/preview/timestamp shared by every job-based inbox surface. */
export function jobInboxBase(job: JobRow): {
  id: string
  title: string
  preview: string
  timestamp: string | null
} {
  return {
    id: job.job_slug,
    title: job.job_title,
    preview: `${job.company_name}${job.location ? ` · ${job.location}` : ''}`,
    timestamp: job.created_at,
  }
}

/** Plain-text excerpt of a job description (HTML flattened, whitespace collapsed). */
export function jobDescriptionExcerpt(job: JobRow): string {
  return plainTextFromJobDescription(job.job_description ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Employment types worth surfacing as a pill (skip empty/unrecognized scraped values). */
const MEANINGFUL_EMPLOYMENT_TYPES = new Set([
  'full_time',
  'part_time',
  'contract',
  'freelance',
  'internship',
  'temporary',
])

/** Right-aligned status pills for the public job board (Featured, work mode, employment). */
export function jobPublicPills(job: JobRow): InboxPillItem[] {
  const pills: InboxPillItem[] = []
  if (job.featured) {
    pills.push({ label: 'Featured', variant: 'success' })
  }
  if (job.work_mode) {
    pills.push({ label: formatJobEnumLabel(job.work_mode), variant: 'muted' })
  }
  if (
    job.employment_type &&
    MEANINGFUL_EMPLOYMENT_TYPES.has(job.employment_type.trim().toLowerCase())
  ) {
    pills.push({
      label: formatJobEnumLabel(job.employment_type),
      variant: 'muted',
    })
  }
  return pills.slice(0, 3)
}
