import type { Database } from '../../src/lib/supabase/database.types'

type EmploymentType = Database['public']['Enums']['employment_type']
type ExperienceLevel = Database['public']['Enums']['experience_level']
type JobType = Database['public']['Enums']['job_type']
type WorkMode = Database['public']['Enums']['work_mode']

const EMPLOYMENT_TYPES = new Set<EmploymentType>([
  'full_time',
  'part_time',
  'contract',
  'freelance',
])
const EXPERIENCE_LEVELS = new Set<ExperienceLevel>([
  'entry',
  'mid',
  'senior',
  'lead',
  'principal',
])
const JOB_TYPES = new Set<JobType>([
  'developer',
  'consultant',
  'architect',
  'admin',
  'analyst',
  'manager',
  'other',
])
const WORK_MODES = new Set<WorkMode>(['remote', 'hybrid', 'onsite'])

export type IngestLinkedInJobInput = {
  external_id?: string
  job_title: string
  company_name: string
  company_logo?: string
  company_website?: string
  location?: string
  apply_url: string
  job_description: string
  posted_at?: string
  employment_type?: string
  experience_level?: string
  work_mode?: string
  job_type?: string
  skills?: string[]
  modules?: string[]
  certifications?: string[]
  job_slug?: string
}

export function normalizeLinkedInApplyUrl(raw: string): string {
  const trimmed = raw.trim()
  try {
    const u = new URL(trimmed)
    if (u.hostname === 'linkedin.com') u.hostname = 'www.linkedin.com'
    u.search = ''
    u.hash = ''
    return u.toString().replace(/\/$/, '')
  } catch {
    return trimmed
  }
}

function sanitizeHttpUrl(raw: string | undefined): string | null {
  const trimmed = raw?.trim()
  if (!trimmed) return null
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    if (parsed.hostname === 'linkedin.com') parsed.hostname = 'www.linkedin.com'
    return parsed.toString()
  } catch {
    return null
  }
}

export function normalizeCompanyLogoUrl(raw: string | undefined): string | null {
  const sanitized = sanitizeHttpUrl(raw)
  if (!sanitized) return null
  const parsed = new URL(sanitized)
  parsed.hash = ''
  return parsed.toString()
}

export function normalizeCompanyWebsiteUrl(raw: string | undefined): string | null {
  const sanitized = sanitizeHttpUrl(raw)
  if (!sanitized) return null
  const parsed = new URL(sanitized)
  if (parsed.hostname.endsWith('linkedin.com')) return null
  parsed.hash = ''
  parsed.search = ''
  return parsed.toString().replace(/\/$/, '')
}

export function slugFromIngestJob(job: IngestLinkedInJobInput): string {
  if (job.job_slug?.trim()) {
    return job.job_slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-')
  }
  const idPart =
    job.external_id?.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase() ??
    hashString(job.apply_url)
  return `linkedin-${idPart}`.slice(0, 120)
}

function hashString(value: string): string {
  let h = 0
  for (let i = 0; i < value.length; i++) {
    h = (h << 5) - h + value.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h).toString(36)
}

function pickEnum<T extends string>(
  value: string | undefined,
  allowed: Set<T>,
  fallback: T
): T {
  if (value && allowed.has(value as T)) return value as T
  return fallback
}

export function listingExpiresAtIso(daysFromNow = 90): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  return d.toISOString()
}

function normalizeIsoDate(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim()
  if (!trimmed) return undefined
  const timestamp = Date.parse(trimmed)
  if (!Number.isFinite(timestamp)) return undefined
  return new Date(timestamp).toISOString()
}

export function buildIngestJobRow(
  job: IngestLinkedInJobInput,
  recruiter: { id: string; email: string; name: string }
) {
  const applyUrl = normalizeLinkedInApplyUrl(job.apply_url)
  return {
    recruiter_id: recruiter.id,
    recruiter_email: recruiter.email,
    recruiter_name: recruiter.name,
    job_slug: slugFromIngestJob({ ...job, apply_url: applyUrl }),
    job_title: job.job_title.trim(),
    company_name: job.company_name.trim(),
    company_logo: normalizeCompanyLogoUrl(job.company_logo),
    company_website: normalizeCompanyWebsiteUrl(job.company_website),
    job_description: job.job_description.trim(),
    created_at: normalizeIsoDate(job.posted_at),
    location: (job.location ?? '').trim() || 'Location TBD',
    employment_type: pickEnum(job.employment_type, EMPLOYMENT_TYPES, 'full_time'),
    experience_level: pickEnum(
      job.experience_level,
      EXPERIENCE_LEVELS,
      'mid'
    ),
    work_mode: pickEnum(job.work_mode, WORK_MODES, 'remote'),
    job_type: pickEnum(job.job_type, JOB_TYPES, 'other'),
    apply_url: applyUrl,
    approval_status: 'approved' as const,
    payment_status: 'paid' as const,
    listing_duration: 'monthly' as const,
    listing_tier: 'standard' as const,
    listing_expires_at: listingExpiresAtIso(),
    featured: false,
    source_kind: 'linkedin_import' as const,
    certifications: job.certifications ?? [],
    modules: job.modules ?? [],
    skills: job.skills ?? [],
  }
}

export function parseIngestJobsFile(raw: string): IngestLinkedInJobInput[] {
  const parsed = JSON.parse(raw) as unknown
  if (!Array.isArray(parsed)) {
    throw new Error('Ingest jobs file must be a JSON array')
  }
  return parsed.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Invalid job at index ${index}`)
    }
    const row = item as Record<string, unknown>
    const job_title = String(row.job_title ?? '').trim()
    const company_name = String(row.company_name ?? '').trim()
    const apply_url = String(row.apply_url ?? '').trim()
    const job_description = String(row.job_description ?? '').trim()
    if (!job_title || !company_name || !apply_url || !job_description) {
      throw new Error(
        `Job at index ${index} missing job_title, company_name, apply_url, or job_description`
      )
    }
    return {
      external_id:
        row.external_id != null ? String(row.external_id) : undefined,
      job_title,
      company_name,
      company_logo:
        row.company_logo != null ? String(row.company_logo) : undefined,
      company_website:
        row.company_website != null ? String(row.company_website) : undefined,
      location: row.location != null ? String(row.location) : undefined,
      apply_url,
      job_description,
      posted_at: row.posted_at != null ? String(row.posted_at) : undefined,
      employment_type:
        row.employment_type != null
          ? String(row.employment_type)
          : undefined,
      experience_level:
        row.experience_level != null
          ? String(row.experience_level)
          : undefined,
      work_mode: row.work_mode != null ? String(row.work_mode) : undefined,
      job_type: row.job_type != null ? String(row.job_type) : undefined,
      skills: Array.isArray(row.skills)
        ? row.skills.map((s) => String(s))
        : undefined,
      modules: Array.isArray(row.modules)
        ? row.modules.map((s) => String(s))
        : undefined,
      certifications: Array.isArray(row.certifications)
        ? row.certifications.map((s) => String(s))
        : undefined,
      job_slug: row.job_slug != null ? String(row.job_slug) : undefined,
    }
  })
}
