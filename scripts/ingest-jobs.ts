/**
 * LinkedIn job ingest → Supabase `public.jobs` (`source_kind = linkedin_import`).
 *
 * Run (uses the same `.env` as the app — `VITE_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`):
 *   pnpm ingest:jobs
 *
 * Batch file (default `data/linkedin-jobs.json`, override with INGEST_JOBS_FILE):
 *   Array of objects — see docs/linkedin-job-ingestion.md
 *
 * Validate without credentials or writes: pnpm ingest:jobs --dry-run
 */
import { createClient } from '@supabase/supabase-js'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import {
  buildIngestJobRow,
  buildIngestJobUpdate,
  normalizeCompanyLogoUrl,
  normalizeCompanyWebsiteUrl,
  normalizeLinkedInApplyUrl,
  parseIngestJobsFile,
} from './lib/ingest-linkedin-jobs'
import './lib/load-local-env'

const DEFAULT_JOBS_FILE = resolve(process.cwd(), 'data/linkedin-jobs.json')

function isGeneratedFavicon(url: string): boolean {
  return /google\.com\/s2\/favicons/i.test(url)
}

function pickCompanyLogoForUpdate(input: {
  existingLogo: string | null
  incomingLogo: string | null
}): string | null {
  const existing = normalizeCompanyLogoUrl(input.existingLogo ?? undefined)
  const incoming = normalizeCompanyLogoUrl(input.incomingLogo ?? undefined)

  if (incoming && !isGeneratedFavicon(incoming)) return incoming
  if (existing) return existing
  return incoming
}

function pickCompanyWebsiteForUpdate(input: {
  existingWebsite: string | null
  incomingWebsite: string | null
}): string | null {
  const existing = normalizeCompanyWebsiteUrl(
    input.existingWebsite ?? undefined
  )
  const incoming = normalizeCompanyWebsiteUrl(
    input.incomingWebsite ?? undefined
  )
  return incoming ?? existing
}

function resolveJobsFilePath(): string | null {
  const explicit = process.env.INGEST_JOBS_FILE?.trim()
  if (explicit) return resolve(explicit)
  if (existsSync(DEFAULT_JOBS_FILE)) return DEFAULT_JOBS_FILE
  return null
}

function resolveSupabaseUrl(): string | undefined {
  return (
    process.env.SUPABASE_URL?.trim() ||
    process.env.VITE_SUPABASE_URL?.trim() ||
    undefined
  )
}

async function main() {
  const jobsFile = resolveJobsFilePath()
  if (!jobsFile)
    throw new Error('No job dump found. Run pnpm scrape:linkedin first.')
  const inputs = parseIngestJobsFile(readFileSync(jobsFile, 'utf8'))
  if (inputs.length === 0) throw new Error('Refusing an empty job dump')
  console.log(`Loaded ${inputs.length} job(s) from ${jobsFile}`)
  // Validate the entire batch before the first database write.
  const validationOwner = {
    id: 'dry-run',
    email: '',
    name: 'Import validation',
  }
  for (const input of inputs) buildIngestJobRow(input, validationOwner)
  if (process.argv.includes('--dry-run')) {
    console.log(
      `Dry run passed: ${inputs.length} valid jobs; no database writes.`
    )
    return
  }
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
  let recruiter: { id: string; email: string; name: string }

  if (recruiterId) {
    const { data, error: recErr } = await sb
      .from('recruiters')
      .select('id, email, name, disabled')
      .eq('id', recruiterId)
      .maybeSingle()
    if (recErr || !data || data.disabled !== false) {
      console.error('Invalid INGEST_RECRUITER_ID', recErr?.message)
      process.exit(1)
    }
    recruiter = data
  } else {
    throw new Error(
      'Set INGEST_RECRUITER_ID to a dedicated system recruiter; refusing to use a hiring account.'
    )
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
      .select(
        'id, job_slug, company_logo, company_website, source_kind, approval_status, payment_status, created_at, updated_at'
      )
      .eq('apply_url', applyKey)
      .maybeSingle()

    if (findErr) {
      console.error('Lookup failed:', applyKey, findErr.message)
      failed++
      continue
    }

    if (existing) {
      if (
        existing.source_kind !== 'linkedin_import' ||
        existing.approval_status !== 'approved' ||
        existing.payment_status !== 'paid'
      ) {
        console.log(
          'Preserved existing ownership/moderation/payment state:',
          existing.job_slug
        )
        skipped++
        continue
      }
      const companyLogo = pickCompanyLogoForUpdate({
        existingLogo: existing.company_logo,
        incomingLogo: row.company_logo,
      })
      const companyWebsite = pickCompanyWebsiteForUpdate({
        existingWebsite: existing.company_website,
        incomingWebsite: row.company_website,
      })
      const updatePayload = {
        ...buildIngestJobUpdate(row, existing.created_at),
        company_logo: companyLogo,
        company_website: companyWebsite,
      }

      const { data: updatedRow, error: updateErr } = await sb
        .from('jobs')
        .update(updatePayload)
        .eq('id', existing.id)
        .eq('source_kind', 'linkedin_import')
        .eq('approval_status', 'approved')
        .eq('payment_status', 'paid')
        .eq('updated_at', existing.updated_at)
        .select('id')
        .maybeSingle()

      if (updateErr) {
        console.error('Update failed:', existing.job_slug, updateErr.message)
        failed++
      } else if (!updatedRow) {
        console.warn('Job changed during import; retry:', existing.job_slug)
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

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Job import failed')
  process.exitCode = 1
})
