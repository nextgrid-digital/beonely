import { publicSiteOrigin } from '@/lib/site/site-origin'
import type { JobRow } from '@/lib/supabase/database.types'

export { publicSiteOrigin }

export function publicJobUrl(jobSlug: string): string {
  const origin = publicSiteOrigin()
  const path = `/jobs/${encodeURIComponent(jobSlug)}`
  return origin ? `${origin}${path}` : path
}

export function jobOgImageUrl(jobSlug: string): string {
  const origin = publicSiteOrigin()
  const query = `slug=${encodeURIComponent(jobSlug)}`
  return origin ? `${origin}/api/og/job?${query}` : `/api/og/job?${query}`
}

export function jobShareMessage(
  job: Pick<JobRow, 'job_title' | 'company_name' | 'location' | 'job_slug'>
): string {
  const url = publicJobUrl(job.job_slug)
  const location = job.location?.trim()
  const parts = [
    `${job.job_title} at ${job.company_name}`,
    location ? location : null,
    url,
  ].filter(Boolean)
  return parts.join('\n')
}

export function jobShareTitle(
  job: Pick<JobRow, 'job_title' | 'company_name'>
): string {
  return `${job.job_title} · ${job.company_name}`
}
