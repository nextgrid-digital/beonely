/**
 * LinkedIn job ingest → Supabase `public.jobs` (`source_kind = linkedin_import`).
 *
 * Run (uses the same `.env` as the app — `VITE_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`):
 *   pnpm ingest:jobs
 *
 * Batch file (default `data/linkedin-jobs.json`, override with INGEST_JOBS_FILE):
 *   Array of objects — see docs/linkedin-job-ingestion.md
 *
 * Single demo row (no batch file):
 *   INGEST_JOB_DESCRIPTION / INGEST_JOB_DESCRIPTION_FILE optional
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import {
  buildIngestJobRow,
  normalizeLinkedInApplyUrl,
  parseIngestJobsFile,
  type IngestLinkedInJobInput,
} from './lib/ingest-linkedin-jobs'

const DEFAULT_JOBS_FILE = resolve(process.cwd(), 'data/linkedin-jobs.json')
const DEFAULT_JOB_DESCRIPTION =
  'Demo listing created by scripts/ingest-jobs.ts — replace with real pipeline output.'

function resolveIngestJobDescription(): string {
  const filePath = process.env.INGEST_JOB_DESCRIPTION_FILE
  if (filePath) {
    if (!existsSync(filePath)) {
      console.error('INGEST_JOB_DESCRIPTION_FILE not found:', filePath)
      process.exit(1)
    }
    return readFileSync(filePath, 'utf8').trim()
  }
  const inline = process.env.INGEST_JOB_DESCRIPTION?.trim()
  if (inline) return inline
  return DEFAULT_JOB_DESCRIPTION
}

function resolveJobsFilePath(): string | null {
  const explicit = process.env.INGEST_JOBS_FILE?.trim()
  if (explicit) return resolve(explicit)
  if (existsSync(DEFAULT_JOBS_FILE)) return DEFAULT_JOBS_FILE
  return null
}

function demoJob(): IngestLinkedInJobInput {
  return {
    external_id: `demo-${Date.now().toString(36)}`,
    job_title: 'ServiceNow Architect (ingested demo)',
    company_name: 'Demo Partner',
    job_description: resolveIngestJobDescription(),
    location: 'Remote',
    employment_type: 'contract',
    experience_level: 'senior',
    work_mode: 'remote',
    job_type: 'architect',
    apply_url: 'https://www.linkedin.com/jobs/view/ingest-demo',
    skills: [],
    modules: [],
    certifications: [],
  }
}

function resolveSupabaseUrl(): string | undefined {
  return (
    process.env.SUPABASE_URL?.trim() ||
    process.env.VITE_SUPABASE_URL?.trim() ||
    undefined
  )
}

async function main() {
  const url = resolveSupabaseUrl()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) {
    console.error(
      'Missing Supabase env. Set SUPABASE_SERVICE_ROLE_KEY and either SUPABASE_URL or VITE_SUPABASE_URL (same project as the app).'
    )
    process.exit(1)
  }

  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const recruiterId = process.env.INGEST_RECRUITER_ID?.trim()
  let recruiter: { id: string; email: string; name: string } | null = null

  if (recruiterId) {
    const { data, error: recErr } = await sb
      .from('recruiters')
      .select('id, email, name')
      .eq('id', recruiterId)
      .maybeSingle()
    if (recErr || !data) {
      console.error('Invalid INGEST_RECRUITER_ID', recErr?.message)
      process.exit(1)
    }
    recruiter = data
  } else {
    const { data, error: recErr } = await sb
      .from('recruiters')
      .select('id, email, name')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (recErr || !data) {
      console.error(
        'No INGEST_RECRUITER_ID and no row in public.recruiters. Create a recruiter account first.'
      )
      process.exit(1)
    }
    recruiter = data
    console.log('Using recruiter for ingest:', recruiter.id, recruiter.email)
  }

  const jobsFile = resolveJobsFilePath()
  let inputs: IngestLinkedInJobInput[]
  if (jobsFile) {
    const raw = readFileSync(jobsFile, 'utf8')
    inputs = parseIngestJobsFile(raw)
    console.log(`Loaded ${inputs.length} job(s) from ${jobsFile}`)
  } else {
    inputs = [demoJob()]
    console.log('No batch file found; ingesting single demo job')
  }

  let inserted = 0
  let updated = 0
  let skipped = 0
  let failed = 0

  for (const input of inputs) {
    const row = buildIngestJobRow(input, recruiter)
    const applyKey = normalizeLinkedInApplyUrl(row.apply_url)

    const { data: existing, error: findErr } = await sb
      .from('jobs')
      .select('id, job_slug')
      .eq('apply_url', applyKey)
      .maybeSingle()

    if (findErr) {
      console.error('Lookup failed:', applyKey, findErr.message)
      failed++
      continue
    }

    if (existing) {
      const { error: updateErr } = await sb
        .from('jobs')
        .update({
          job_title: row.job_title,
          company_name: row.company_name,
          job_description: row.job_description,
          location: row.location,
          employment_type: row.employment_type,
          experience_level: row.experience_level,
          work_mode: row.work_mode,
          job_type: row.job_type,
          apply_url: row.apply_url,
          approval_status: row.approval_status,
          payment_status: row.payment_status,
          listing_expires_at: row.listing_expires_at,
          skills: row.skills,
          modules: row.modules,
          certifications: row.certifications,
          source_kind: row.source_kind,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)

      if (updateErr) {
        console.error('Update failed:', existing.job_slug, updateErr.message)
        failed++
      } else {
        console.log('Updated:', existing.job_slug)
        updated++
      }
      continue
    }

    const { error: insertErr } = await sb.from('jobs').insert(row)
    if (insertErr) {
      if (insertErr.code === '23505') {
        console.warn('Skipped duplicate slug:', row.job_slug)
        skipped++
      } else {
        console.error('Insert failed:', row.job_slug, insertErr.message)
        failed++
      }
    } else {
      console.log('Inserted:', row.job_slug)
      inserted++
    }
  }

  console.log(
    `Done. inserted=${inserted} updated=${updated} skipped=${skipped} failed=${failed}`
  )
  const summaryPayload = {
    inserted,
    updated,
    skipped,
    failed,
    processed: inputs.length,
  }

  const summaryFile = process.env.INGEST_SUMMARY_FILE?.trim()
  if (summaryFile) {
    mkdirSync(dirname(summaryFile), { recursive: true })
    writeFileSync(summaryFile, `${JSON.stringify(summaryPayload)}\n`, 'utf8')
  }

  console.log('INGEST_SUMMARY', JSON.stringify(summaryPayload))
  if (failed > 0) process.exit(1)
}

void main()
