import { spawnSync } from 'node:child_process'
import {
  mkdtempSync,
  readFileSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

describe('sync preflight', () => {
  it('fails before scraping or cleanup without credentials and never reuses an old success summary', () => {
    const dir = mkdtempSync(join(tmpdir(), 'beonely-sync-test-'))
    const summaryPath = join(dir, 'summary.json')
    const staleScrapePath = join(dir, 'scrape.json')
    const staleIngestPath = join(dir, 'ingest.json')
    writeFileSync(
      staleScrapePath,
      JSON.stringify({ jobsWritten: 200, failed: 0 })
    )
    writeFileSync(
      staleIngestPath,
      JSON.stringify({ inserted: 200, processed: 200 })
    )
    try {
      const result = spawnSync(
        process.execPath,
        [
          '--import',
          import.meta.resolve('tsx'),
          fileURLToPath(new URL('../sync-jobs-daily.ts', import.meta.url)),
        ],
        {
          cwd: dir,
          env: {
            ...process.env,
            SUPABASE_URL: '',
            VITE_SUPABASE_URL: '',
            SUPABASE_SERVICE_ROLE_KEY: '',
            INGEST_RECRUITER_ID: '',
            JOBS_SYNC_SUMMARY_FILE: summaryPath,
            SCRAPE_LINKEDIN_SUMMARY_FILE: staleScrapePath,
            INGEST_SUMMARY_FILE: staleIngestPath,
          },
          encoding: 'utf8',
          timeout: 15_000,
        }
      )
      expect(result.status, result.stderr).toBe(1)
      const summary = JSON.parse(readFileSync(summaryPath, 'utf8'))
      expect(summary.status).toBe('FAILED')
      expect(summary.scrape.jobsWritten).toBe(0)
      expect(summary.ingest.inserted).toBe(0)
      expect(summary.stale.expired).toBe(0)
      expect(result.stdout).not.toContain('[linkedin-scrape] start')
    } finally {
      for (const path of [summaryPath, staleScrapePath, staleIngestPath])
        unlinkSync(path)
      rmdirSync(dir)
    }
  })
})
