/**
 * LinkedIn guest discovery scraper for ServiceNow jobs (India + remote India-eligible).
 *
 * Writes normalized JSON for ingestion at `data/linkedin-jobs.json` by default.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import './lib/load-local-env'
import {
  resolveLinkedInScrapeConfigFromEnv,
  scrapeLinkedInJobs,
  writeJobsJsonAtomically,
} from './lib/scrape-linkedin-jobs'

function resolveOutputPath(): string {
  const explicit = process.env.SCRAPE_LINKEDIN_OUTPUT_FILE?.trim()
  if (explicit) return resolve(explicit)
  return resolve(process.cwd(), 'data/linkedin-jobs.json')
}

function resolveSummaryPath(): string | null {
  const explicit = process.env.SCRAPE_LINKEDIN_SUMMARY_FILE?.trim()
  if (!explicit) return null
  return resolve(explicit)
}

async function main() {
  const outputPath = resolveOutputPath()
  const summaryPath = resolveSummaryPath()
  const config = resolveLinkedInScrapeConfigFromEnv()

  console.info(
    '[linkedin-scrape] start',
    JSON.stringify({ outputPath, config })
  )

  const { jobs, summary } = await scrapeLinkedInJobs(config, {
    logger: console,
  })

  await writeJobsJsonAtomically(outputPath, jobs)

  const summaryPayload = { ...summary, jobsWritten: jobs.length, outputPath }

  if (summaryPath) {
    await mkdir(dirname(summaryPath), { recursive: true })
    await writeFile(summaryPath, `${JSON.stringify(summaryPayload)}\n`, 'utf8')
  }

  console.info(
    '[linkedin-scrape] wrote file',
    JSON.stringify({ outputPath, jobs: jobs.length })
  )
  console.log('SCRAPE_SUMMARY', JSON.stringify(summaryPayload))
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error('[linkedin-scrape] fatal', message)
  process.exit(1)
})
