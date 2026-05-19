import type { PublicJobRow } from './public-job.js'
import { serverSiteOrigin } from './site-origin.js'

export function truncateText (text: string, maxLen: number): string {
  const trimmed = text.trim()
  if (trimmed.length <= maxLen) return trimmed
  return `${trimmed.slice(0, maxLen - 1).trimEnd()}…`
}

export function stripHtmlToPlain (html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function formatEnumLabel (value: string): string {
  return value.replace(/_/g, ' ')
}

export function publicJobPageUrl (jobSlug: string): string {
  return `${serverSiteOrigin()}/jobs/${encodeURIComponent(jobSlug)}`
}

export function jobOgImageApiUrl (jobSlug: string): string {
  return `${serverSiteOrigin()}/api/og/job?slug=${encodeURIComponent(jobSlug)}`
}

export function jobOgTitle (job: Pick<PublicJobRow, 'job_title'>): string {
  return `${job.job_title} · Beonely`
}

export function jobOgDescription (job: PublicJobRow): string {
  const location = job.location?.trim()
  const fromDesc = job.job_description
    ? stripHtmlToPlain(job.job_description)
    : ''
  const base = location
    ? `${job.company_name} — ${location}`
    : `${job.company_name} — ServiceNow role on Beonely`
  if (fromDesc.length >= 40) {
    return truncateText(fromDesc, 160)
  }
  return truncateText(base, 160)
}

export function jobOgMetaChips (job: PublicJobRow): string[] {
  const chips: string[] = []
  if (job.employment_type) chips.push(formatEnumLabel(job.employment_type))
  if (job.work_mode) chips.push(formatEnumLabel(job.work_mode))
  if (job.featured) chips.push('Featured')
  return chips
}
