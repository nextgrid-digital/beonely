import { tryGetServiceSupabase } from './supabase.js'

export type PublicJobRow = {
  id: string
  job_slug: string
  job_title: string
  company_name: string
  location: string | null
  employment_type: string | null
  work_mode: string | null
  featured: boolean
  job_description: string | null
  company_logo: string | null
}

export function isPublicJobListing (job: {
  approval_status: string
  payment_status: string
  listing_expires_at: string | null
}): boolean {
  if (job.approval_status !== 'approved' || job.payment_status !== 'paid') {
    return false
  }
  if (
    job.listing_expires_at &&
    new Date(job.listing_expires_at).getTime() <= Date.now()
  ) {
    return false
  }
  return true
}

export async function fetchPublicJobBySlug (
  slug: string
): Promise<PublicJobRow | null> {
  const supInit = tryGetServiceSupabase()
  if (!supInit.ok) return null

  const { data, error } = await supInit.client
    .from('jobs')
    .select(
      'id, job_slug, job_title, company_name, location, employment_type, work_mode, featured, job_description, company_logo, approval_status, payment_status, listing_expires_at'
    )
    .eq('job_slug', slug)
    .maybeSingle()

  if (error || !data) return null
  if (!isPublicJobListing(data)) return null

  return {
    id: data.id as string,
    job_slug: data.job_slug as string,
    job_title: data.job_title as string,
    company_name: data.company_name as string,
    location: (data.location as string | null) ?? null,
    employment_type: (data.employment_type as string | null) ?? null,
    work_mode: (data.work_mode as string | null) ?? null,
    featured: Boolean(data.featured),
    job_description: (data.job_description as string | null) ?? null,
    company_logo: (data.company_logo as string | null) ?? null,
  }
}
