/**
 * Daily Beonely LinkedIn jobs maintenance:
 * 1) Scrape fresh listings
 * 2) Ingest/upsert listings into Supabase
 * 3) Expire stale imported rows only when close signals are detected
 *
 * Run:
 *   pnpm sync:jobs
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
import {
  parseIngestJobsFile,
  type IngestLinkedInJobInput,
} from './lib/ingest-linkedin-jobs'
import {
  buildCanonicalApplyUrlSet,
  detectLinkedInClosedSignal,
} from './lib/prune-linkedin-jobs'

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
  }
  errors: string[]
  generatedAt: string
}

const DEFAULT_LINKEDIN_JOBS_FILE = resolve(process.cwd(), 'data/linkedin-jobs.json')

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

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

function getScrapeSummaryPath(): string {
  const explicit = process.env.SCRAPE_LINKEDIN_SUMMARY_FILE?.trim()
  return explicit ? resolve(explicit) : resolve(process.cwd(), '.tmp/scrape-summary.json')
}

function getIngestSummaryPath(): string {
  const explicit = process.env.INGEST_SUMMARY_FILE?.trim()
  return explicit ? resolve(explicit) : resolve(process.cwd(), '.tmp/ingest-summary.json')
}

function readJsonFile<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T
}

async function runCommand(cmd: string, args: string[], env: Record<string, string>) {
  await new Promise<void>((resolvePromise, rejectPromise) => {
    const child = spawn(cmd, args, {
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
      else rejectPromise(new Error(`${cmd} ${args.join(' ')} exited with code ${code ?? -1}`))
    })
  })
}

function resolveJobsFilePath(): string {
  const explicit = process.env.INGEST_JOBS_FILE?.trim()
  return explicit ? resolve(explicit) : DEFAULT_LINKEDIN_JOBS_FILE
}

async function fetchWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent':
          process.env.SCRAPE_LINKEDIN_USER_AGENT?.trim() ||
          'Mozilla/5.0 (compatible; BeonelyJobsBot/1.0; +https://beonely.vercel.app)',
      },
      redirect: 'follow',
    })
  } finally {
    clearTimeout(timeout)
  }
}

async function main() {
  const scrapeSummaryPath = getScrapeSummaryPath()
  const ingestSummaryPath = getIngestSummaryPath()
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
    },
    errors,
    generatedAt: new Date().toISOString(),
  }

  try {
    mkdirSync(dirname(scrapeSummaryPath), { recursive: true })
    mkdirSync(dirname(ingestSummaryPath), { recursive: true })

    await runCommand('pnpm', ['scrape:linkedin'], {
      SCRAPE_LINKEDIN_SUMMARY_FILE: scrapeSummaryPath,
    })

    await runCommand('pnpm', ['ingest:jobs'], {
      INGEST_SUMMARY_FILE: ingestSummaryPath,
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
  } else {
    const maxChecks = parsePositiveInt(process.env.JOBS_STALE_CHECK_MAX, 120)
    const timeoutMs = parsePositiveInt(process.env.JOBS_STALE_CHECK_TIMEOUT_MS, 12000)
    const delayMs = parsePositiveInt(process.env.JOBS_STALE_CHECK_DELAY_MS, 700)

    const sb = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    let sourceJobs: IngestLinkedInJobInput[] = []
    try {
      const raw = readFileSync(resolveJobsFilePath(), 'utf8')
      sourceJobs = parseIngestJobsFile(raw)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      errors.push(`source_jobs_unreadable:${message}`)
      summary.status = summary.status === 'FAILED' ? 'FAILED' : 'PARTIAL_SUCCESS'
    }

    const canonicalApplyUrls = buildCanonicalApplyUrlSet(sourceJobs)

    const { data: importedRows, error: importedRowsError } = await sb
      .from('jobs')
      .select('id, job_slug, apply_url, listing_expires_at')
      .eq('source_kind', 'linkedin_import')

    if (importedRowsError) {
      errors.push(`fetch_imported_jobs_failed:${importedRowsError.message}`)
      summary.status = summary.status === 'FAILED' ? 'FAILED' : 'PARTIAL_SUCCESS'
    } else {
      const nowTs = Date.now()
      const activeImportedRows = (importedRows ?? []).filter((row) => {
        if (!row.listing_expires_at) return true
        return new Date(row.listing_expires_at).getTime() > nowTs
      })

      summary.stale.activeImportedJobs = activeImportedRows.length

      const candidates = activeImportedRows
        .filter((row) => !canonicalApplyUrls.has(row.apply_url))
        .slice(0, maxChecks)

      summary.stale.candidates = candidates.length

      for (const row of candidates) {
        if (summary.stale.checked > 0) {
          await new Promise((r) => setTimeout(r, delayMs))
        }
        summary.stale.checked++

        try {
          const response = await fetchWithTimeout(row.apply_url, timeoutMs)
          const body = await response.text()
          const detection = detectLinkedInClosedSignal({
            status: response.status,
            body,
          })

          if (!detection.closed) {
            summary.stale.skipped++
            continue
          }

          const nowIso = new Date().toISOString()
          const { error: updateError } = await sb
            .from('jobs')
            .update({
              listing_expires_at: nowIso,
              updated_at: nowIso,
            })
            .eq('id', row.id)

          if (updateError) {
            summary.stale.updateErrors++
            errors.push(
              `expire_failed:${row.job_slug ?? row.id}:${updateError.message}`
            )
          } else {
            summary.stale.expired++
            console.info(
              '[jobs-sync] expired stale listing',
              JSON.stringify({
                id: row.id,
                job_slug: row.job_slug,
                reason: detection.reason,
              })
            )
          }
        } catch (error) {
          summary.stale.checkErrors++
          const message = error instanceof Error ? error.message : String(error)
          errors.push(`stale_check_failed:${row.job_slug ?? row.id}:${message}`)
        }
      }
    }
  }

  if (summary.status !== 'FAILED' && errors.length > 0) {
    summary.status = 'PARTIAL_SUCCESS'
  }

  const summaryFile = resolveSyncSummaryFile()
  if (summaryFile) {
    mkdirSync(dirname(summaryFile), { recursive: true })
    writeFileSync(summaryFile, `${JSON.stringify(summary)}\n`, 'utf8')
  }

  console.log('JOBS_DAILY_SYNC_SUMMARY', JSON.stringify(summary))

  if (summary.status === 'FAILED') {
    process.exit(1)
  }
}

void main()
