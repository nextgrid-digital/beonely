/**
 * Daily Beonely LinkedIn jobs maintenance:
 * 1) Scrape fresh listings
 * 2) Ingest/upsert listings into Supabase
 * 3) Expire active imported rows missing from the latest scrape payload
 *
 * Run:
 *   pnpm sync:jobs
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkLinkedInApplyUrl } from './lib/check-linkedin-apply-urls'
import {
  normalizeLinkedInApplyUrl,
  parseIngestJobsFile,
  type IngestLinkedInJobInput,
} from './lib/ingest-linkedin-jobs'
import './lib/load-local-env'
import { buildCanonicalApplyUrlSet } from './lib/prune-linkedin-jobs'

const FRESHNESS_DAYS = parsePositiveIntEnv('JOBS_SYNC_MAX_AGE_DAYS', 90)
const CHECK_APPLY_URLS = process.env.JOBS_SYNC_CHECK_APPLY_URLS !== '0'
const APPLY_CHECK_LIMIT = parsePositiveIntEnv(
  'JOBS_SYNC_APPLY_CHECK_LIMIT',
  250
)
const APPLY_CHECK_DELAY_MS = parsePositiveIntEnv(
  'JOBS_SYNC_APPLY_CHECK_DELAY_MS',
  800
)
// Missing from one scrape is not proof a listing closed: LinkedIn can return a
// partial page during throttling. Age and direct URL liveness remain the safe
// default cleanup signals.
const ENABLE_MISSING_EXPIRY =
  process.env.JOBS_SYNC_ENABLE_MISSING_EXPIRY === '1'
const MIN_SCRAPE_COVERAGE = 0.8

function parsePositiveIntEnv(name: string, fallback: number): number {
  const value = Number.parseInt(process.env[name] ?? '', 10)
  return Number.isFinite(value) && value > 0 ? value : fallback
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

type ScrapeSummary = {
  jobsWritten?: number
  filteredOut?: number
  deduped?: number
  failed?: number
}

type IngestSummary = {
  inserted?: number
  updated?: number
  skipped?: number
  failed?: number
  processed?: number
}

type DailySyncSummary = {
  status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED'
  scrape: {
    jobsWritten: number
    filteredOut: number
    deduped: number
    failed: number
  }
  ingest: {
    inserted: number
    updated: number
    skipped: number
    failed: number
    processed: number
  }
  stale: {
    activeImportedJobs: number
    candidates: number
    checked: number
    expired: number
    skipped: number
    checkErrors: number
    updateErrors: number
    /** Live imported rows expired for being older than the freshness window. */
    agedOut: number
    /** Live imported rows expired because their LinkedIn page is gone/closed. */
    deadLinks: number
  }
  errors: string[]
  generatedAt: string
}

const DEFAULT_LINKEDIN_JOBS_FILE = resolve(
  process.cwd(),
  'data/linkedin-jobs.json'
)

function resolveSupabaseUrl(): string | undefined {
  return (
    process.env.SUPABASE_URL?.trim() ||
    process.env.VITE_SUPABASE_URL?.trim() ||
    undefined
  )
}

function resolveSyncSummaryFile(): string | null {
  const explicit = process.env.JOBS_SYNC_SUMMARY_FILE?.trim()
  if (explicit) return resolve(explicit)
  return null
}

function readJsonFile<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T
}

async function runScript(script: string, env: Record<string, string>) {
  const scriptPath = fileURLToPath(new URL(`./${script}`, import.meta.url))
  await new Promise<void>((resolvePromise, rejectPromise) => {
    // Invoke Node directly: pnpm.cmd cannot be spawned without a shell on Windows.
    const child = spawn(process.execPath, ['--import', 'tsx', scriptPath], {
      stdio: 'inherit',
      env: {
        ...process.env,
        ...env,
      },
      shell: false,
    })
    child.on('error', rejectPromise)
    child.on('exit', (code) => {
      if (code === 0) resolvePromise()
      else rejectPromise(new Error(`${script} exited with code ${code ?? -1}`))
    })
  })
}

function resolveJobsFilePath(): string {
  const explicit = process.env.INGEST_JOBS_FILE?.trim()
  return explicit ? resolve(explicit) : DEFAULT_LINKEDIN_JOBS_FILE
}

type SupabaseLike = SupabaseClient

/**
 * Expire live imported rows that are (1) older than the freshness window, or
 * (2) whose LinkedIn page is gone/closed. Soft-expire only (keeps rows).
 */
async function runFreshnessAndLivenessSweeps(
  sb: SupabaseLike,
  summary: DailySyncSummary,
  errors: string[]
): Promise<void> {
  // 1) Freshness sweep: expire anything posted more than FRESHNESS_DAYS ago.
  const nowIso = new Date().toISOString()
  const cutoffIso = new Date(
    Date.now() - FRESHNESS_DAYS * 24 * 60 * 60 * 1000
  ).toISOString()

  const { data: agedRows, error: agedError } = await sb
    .from('jobs')
    .update({ listing_expires_at: nowIso, updated_at: nowIso })
    .eq('source_kind', 'linkedin_import')
    .eq('approval_status', 'approved')
    .eq('payment_status', 'paid')
    .lt('created_at', cutoffIso)
    .or(`listing_expires_at.is.null,listing_expires_at.gt.${nowIso}`)
    .select('id')

  if (agedError) {
    summary.stale.updateErrors++
    errors.push(`age_out_sweep_failed:${agedError.message}`)
  } else {
    summary.stale.agedOut = agedRows?.length ?? 0
    if (summary.stale.agedOut > 0) {
      console.info(
        '[jobs-sync] expired imported listings older than freshness window',
        JSON.stringify({ days: FRESHNESS_DAYS, count: summary.stale.agedOut })
      )
    }
  }

  if (!CHECK_APPLY_URLS) return

  // 2) Liveness recheck: HTTP-verify each remaining live row's apply_url.
  const liveNowIso = new Date().toISOString()
  const { data: liveRows, error: liveError } = await sb
    .from('jobs')
    .select('id, apply_url, listing_expires_at')
    .eq('source_kind', 'linkedin_import')
    .eq('approval_status', 'approved')
    .eq('payment_status', 'paid')
    .or(`listing_expires_at.is.null,listing_expires_at.gt.${liveNowIso}`)
    .limit(APPLY_CHECK_LIMIT)

  if (liveError) {
    summary.stale.checkErrors++
    errors.push(`liveness_fetch_failed:${liveError.message}`)
    return
  }

  const deadIds: string[] = []
  for (const row of liveRows ?? []) {
    const result = await checkLinkedInApplyUrl(row.apply_url)
    if (
      result.reason === 'http_error' ||
      result.reason === 'request_failed' ||
      result.reason === 'invalid_url'
    ) {
      summary.stale.checkErrors++
    }
    if (!result.live) {
      deadIds.push(row.id)
      console.info(
        '[jobs-sync] apply url not accepting applications',
        JSON.stringify({
          url: result.url,
          reason: result.reason,
          status: result.status,
        })
      )
    }
    await sleep(APPLY_CHECK_DELAY_MS)
  }

  if (deadIds.length > 0) {
    const expireIso = new Date().toISOString()
    const { error: expireError } = await sb
      .from('jobs')
      .update({ listing_expires_at: expireIso, updated_at: expireIso })
      .in('id', deadIds)
      .eq('source_kind', 'linkedin_import')
    if (expireError) {
      summary.stale.updateErrors++
      errors.push(`expire_dead_links_failed:${expireError.message}`)
    } else {
      summary.stale.deadLinks = deadIds.length
    }
  }
}

async function main() {
  // A run owns its summaries; a failed command must never read yesterday's success.
  const runDir = mkdtempSync(resolve(tmpdir(), 'beonely-jobs-sync-'))
  const scrapeSummaryPath = resolve(runDir, 'scrape-summary.json')
  const ingestSummaryPath = resolve(runDir, 'ingest-summary.json')
  const errors: string[] = []

  const summary: DailySyncSummary = {
    status: 'SUCCESS',
    scrape: { jobsWritten: 0, filteredOut: 0, deduped: 0, failed: 0 },
    ingest: { inserted: 0, updated: 0, skipped: 0, failed: 0, processed: 0 },
    stale: {
      activeImportedJobs: 0,
      candidates: 0,
      checked: 0,
      expired: 0,
      skipped: 0,
      checkErrors: 0,
      updateErrors: 0,
      agedOut: 0,
      deadLinks: 0,
    },
    errors,
    generatedAt: new Date().toISOString(),
  }

  try {
    if (
      !resolveSupabaseUrl() ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
      !process.env.INGEST_RECRUITER_ID?.trim()
    ) {
      throw new Error(
        'Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and a dedicated INGEST_RECRUITER_ID before syncing.'
      )
    }
    mkdirSync(dirname(scrapeSummaryPath), { recursive: true })
    mkdirSync(dirname(ingestSummaryPath), { recursive: true })

    const jobsFile = resolveJobsFilePath()
    await runScript('scrape-linkedin-jobs.ts', {
      SCRAPE_LINKEDIN_SUMMARY_FILE: scrapeSummaryPath,
      SCRAPE_LINKEDIN_OUTPUT_FILE: jobsFile,
      SCRAPE_LINKEDIN_POSTED_WITHIN_SECONDS: String(FRESHNESS_DAYS * 86_400),
    })

    await runScript('ingest-jobs.ts', {
      INGEST_SUMMARY_FILE: ingestSummaryPath,
      INGEST_JOBS_FILE: jobsFile,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    errors.push(`pipeline_failed:${message}`)
    summary.status = 'FAILED'
  }

  try {
    const scrape = readJsonFile<ScrapeSummary>(scrapeSummaryPath)
    summary.scrape.jobsWritten = scrape.jobsWritten ?? 0
    summary.scrape.filteredOut = scrape.filteredOut ?? 0
    summary.scrape.deduped = scrape.deduped ?? 0
    summary.scrape.failed = scrape.failed ?? 0
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    errors.push(`scrape_summary_unreadable:${message}`)
  }

  try {
    const ingest = readJsonFile<IngestSummary>(ingestSummaryPath)
    summary.ingest.inserted = ingest.inserted ?? 0
    summary.ingest.updated = ingest.updated ?? 0
    summary.ingest.skipped = ingest.skipped ?? 0
    summary.ingest.failed = ingest.failed ?? 0
    summary.ingest.processed = ingest.processed ?? 0
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    errors.push(`ingest_summary_unreadable:${message}`)
  }

  const url = resolveSupabaseUrl()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (!url || !key) {
    errors.push(
      'missing_supabase_env: set SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL (or VITE_SUPABASE_URL)'
    )
    summary.status = summary.status === 'FAILED' ? 'FAILED' : 'PARTIAL_SUCCESS'
  } else if (summary.status !== 'FAILED') {
    const sb = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    let sourceJobs: IngestLinkedInJobInput[] = []
    let sourceJobsLoaded = false
    try {
      const raw = readFileSync(resolveJobsFilePath(), 'utf8')
      sourceJobs = parseIngestJobsFile(raw)
      sourceJobsLoaded = true
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      errors.push(`source_jobs_unreadable:${message}`)
      summary.status = 'PARTIAL_SUCCESS'
    }

    if (!sourceJobsLoaded) {
      summary.stale.skipped++
      errors.push('stale_cleanup_skipped:source_jobs_unavailable')
      summary.status = 'PARTIAL_SUCCESS'
    } else {
      const canonicalApplyUrls = buildCanonicalApplyUrlSet(sourceJobs)

      const importedRows: Array<{
        id: string
        job_slug: string
        apply_url: string | null
        listing_expires_at: string | null
      }> = []
      let importedRowsError: { message: string } | null = null
      for (let offset = 0; ; offset += 500) {
        const result = await sb
          .from('jobs')
          .select('id, job_slug, apply_url, listing_expires_at')
          .eq('source_kind', 'linkedin_import')
          .eq('approval_status', 'approved')
          .eq('payment_status', 'paid')
          .order('id')
          .range(offset, offset + 499)
        if (result.error) {
          importedRowsError = result.error
          break
        }
        importedRows.push(...(result.data ?? []))
        if ((result.data?.length ?? 0) < 500) break
      }

      if (importedRowsError) {
        errors.push(`fetch_imported_jobs_failed:${importedRowsError.message}`)
        summary.status = 'PARTIAL_SUCCESS'
      } else {
        const nowTs = Date.now()
        const activeImportedRows = (importedRows ?? []).filter((row) => {
          if (!row.listing_expires_at) return true
          return new Date(row.listing_expires_at).getTime() > nowTs
        })

        summary.stale.activeImportedJobs = activeImportedRows.length

        const candidates = activeImportedRows.filter(
          (row) =>
            !canonicalApplyUrls.has(
              normalizeLinkedInApplyUrl(row.apply_url ?? '')
            )
        )

        summary.stale.candidates = candidates.length
        summary.stale.checked = candidates.length

        const coverage =
          activeImportedRows.length === 0
            ? 1
            : canonicalApplyUrls.size / activeImportedRows.length
        const healthyMissingSweep =
          ENABLE_MISSING_EXPIRY &&
          summary.status === 'SUCCESS' &&
          summary.scrape.failed === 0 &&
          canonicalApplyUrls.size >= 25 &&
          coverage >= MIN_SCRAPE_COVERAGE

        if (candidates.length > 0 && healthyMissingSweep) {
          const nowIso = new Date().toISOString()
          const candidateIds = candidates.map((row) => row.id)
          const { error: updateError } = await sb
            .from('jobs')
            .update({
              listing_expires_at: nowIso,
              updated_at: nowIso,
            })
            .in('id', candidateIds)

          if (updateError) {
            summary.stale.updateErrors++
            errors.push(`expire_missing_imports_failed:${updateError.message}`)
          } else {
            summary.stale.expired = candidates.length
            console.info(
              '[jobs-sync] expired imported listings missing from latest scrape',
              JSON.stringify({
                count: candidates.length,
              })
            )
          }
        } else if (candidates.length > 0) {
          summary.stale.skipped += candidates.length
          console.warn(
            '[jobs-sync] skipped missing-listing expiry because scrape health was not conclusive',
            JSON.stringify({
              candidates: candidates.length,
              activeImportedJobs: activeImportedRows.length,
              scrapedUrls: canonicalApplyUrls.size,
              coverage,
              enabled: ENABLE_MISSING_EXPIRY,
            })
          )
        }
      }
    }

    try {
      await runFreshnessAndLivenessSweeps(sb, summary, errors)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      errors.push(`freshness_liveness_sweep_failed:${message}`)
      summary.status = 'PARTIAL_SUCCESS'
    }
  }

  if (
    summary.status !== 'FAILED' &&
    (errors.length > 0 ||
      summary.scrape.failed > 0 ||
      summary.ingest.failed > 0 ||
      summary.stale.checkErrors > 0)
  ) {
    summary.status = 'PARTIAL_SUCCESS'
  }

  const summaryFile = resolveSyncSummaryFile()
  if (summaryFile) {
    mkdirSync(dirname(summaryFile), { recursive: true })
    writeFileSync(summaryFile, `${JSON.stringify(summary)}\n`, 'utf8')
  }

  console.log('JOBS_DAILY_SYNC_SUMMARY', JSON.stringify(summary))

  if (summary.status !== 'SUCCESS') {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Job sync failed')
  process.exitCode = 1
})
