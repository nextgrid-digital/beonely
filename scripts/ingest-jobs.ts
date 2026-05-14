/**
 * Demo ingestion aligned with live `public.jobs` schema.
 * Run with:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... INGEST_RECRUITER_ID=<uuid> pnpm exec tsx scripts/ingest-jobs.ts
 *
 * Optional full job body (LinkedIn / long descriptions):
 *   INGEST_JOB_DESCRIPTION="..." multiline via shell here-doc, or
 *   INGEST_JOB_DESCRIPTION_FILE=/path/to/description.txt
 */
import { existsSync, readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const DEFAULT_JOB_DESCRIPTION =
  'Demo listing created by scripts/ingest-jobs.ts — replace with real pipeline output.'

function resolveIngestJobDescription (): string {
  const filePath = process.env.INGEST_JOB_DESCRIPTION_FILE
  if (filePath) {
    if (!existsSync(filePath)) {
      // eslint-disable-next-line no-console
      console.error('INGEST_JOB_DESCRIPTION_FILE not found:', filePath)
      process.exit(1)
    }
    return readFileSync(filePath, 'utf8').trim()
  }
  const inline = process.env.INGEST_JOB_DESCRIPTION?.trim()
  if (inline) return inline
  return DEFAULT_JOB_DESCRIPTION
}

async function main () {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const recruiterId = process.env.INGEST_RECRUITER_ID
  if (!url || !key) {
    // eslint-disable-next-line no-console
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }
  if (!recruiterId) {
    // eslint-disable-next-line no-console
    console.error('Missing INGEST_RECRUITER_ID (existing recruiters.id)')
    process.exit(1)
  }

  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: recruiter, error: recErr } = await sb
    .from('recruiters')
    .select('id, email, name')
    .eq('id', recruiterId)
    .maybeSingle()

  if (recErr || !recruiter) {
    // eslint-disable-next-line no-console
    console.error('Invalid INGEST_RECRUITER_ID', recErr?.message)
    process.exit(1)
  }

  const slug = `ingest-demo-servicenow-architect-${Date.now().toString(36)}`

  const row = {
    recruiter_id: recruiter.id,
    recruiter_email: recruiter.email,
    recruiter_name: recruiter.name,
    job_slug: slug,
    job_title: 'ServiceNow Architect (ingested demo)',
    company_name: 'Demo Partner',
    job_description: resolveIngestJobDescription(),
    location: 'Remote',
    employment_type: 'contract' as const,
    experience_level: 'senior' as const,
    work_mode: 'remote' as const,
    job_type: 'architect' as const,
    apply_url: 'https://example.com/apply',
    approval_status: 'pending' as const,
    payment_status: 'unpaid' as const,
    listing_duration: 'monthly' as const,
    listing_tier: 'standard' as const,
    featured: false,
    source_kind: 'linkedin_import' as const,
    certifications: [] as string[],
    modules: [] as string[],
    skills: [] as string[],
  }

  const { error } = await sb.from('jobs').insert(row)
  if (error) {
    // eslint-disable-next-line no-console
    console.error(error)
    process.exit(1)
  }
  // eslint-disable-next-line no-console
  console.log('Ingest OK:', slug)
}

void main()
