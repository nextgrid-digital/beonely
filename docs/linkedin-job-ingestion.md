# LinkedIn job ingestion

The public board reads Supabase's public_jobs view. The saved data/linkedin-jobs.json file is importer input; changing the file alone does not update the live site.

## Current refresh

**Production update:** signed-in Edge access resolved the account mismatch. All 200 jobs were imported into the live project: **156 inserted, 44 updated, zero failures**. The board displayed **340 active jobs** afterward. See the [production follow-up](PRODUCTION_RELEASE_2026-09-06.md) for the current deployment and workflow status; it supersedes the initial access limitations below. The user explicitly approved retaining the existing import owner for this refresh.

On 6 September 2026 the live board displayed 183 jobs, with the newest visible posting dated 15 August. The refreshed local dump contains **200 unique jobs** dated 8 July–5 September: **101 within 7 days, 191 within 30 days, and all 200 within 90 days** at validation time. The final scrape processed 287 unique detail pages across 36 search requests and completed with no unrecovered requests (one HTTP 429 recovered on retry). All 200 passed the import dry run. No production import has occurred: the correct database credentials and dedicated import recruiter are unavailable locally.

The GitHub Ingest jobs workflow is disabled_manually and has no repository secrets. The accessible Vercel project zsw0rds-projects/beonely has no production environment variables; identify the actual project serving beonely.in before configuring or deploying.

## Commands

Use pnpm@11.11.0 (or corepack pnpm). Scripts load an optional local .env; existing environment variables take precedence.

```sh
# Refresh the dump only; no database credentials needed.
pnpm scrape:linkedin

# Validate the complete batch without credentials or writes.
pnpm ingest:jobs --dry-run

# Import the existing validated dump into the configured database.
pnpm ingest:jobs

# Scrape, import, and expire aged-out or confirmed closed listings.
pnpm sync:jobs
```

Full sync validates configuration before scraping, invokes Node directly on Windows, uses one scrape/import file path and reads summaries unique to the current run. A failed pipeline does not run database cleanup. Partial scrape, database or liveness failures produce a nonzero exit code.

## Configuration

| Variable                          | Purpose                                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------------------------ |
| SUPABASE_URL or VITE_SUPABASE_URL | Intended project; must match the deployed site.                                                  |
| SUPABASE_SERVICE_ROLE_KEY         | Required server-only credential; never prefix with VITE\_.                                       |
| INGEST_RECRUITER_ID               | Required enabled dedicated system recruiter; no first-account fallback.                          |
| INGEST_JOBS_FILE                  | Optional input path; defaults to data/linkedin-jobs.json. Full sync also writes the scrape here. |
| INGEST_SUMMARY_FILE               | Optional standalone importer summary output.                                                     |
| JOBS_SYNC_SUMMARY_FILE            | Optional consolidated full-sync summary with scrape/import/cleanup counts.                       |

Empty dumps, missing files, non-LinkedIn job URLs and unknown/invalid/future posting dates fail before any writes. There is no automatic demo fallback.

## Publication and freshness

- New imports are approved, paid LinkedIn imports without creating a Razorpay payment.
- Updates refresh only existing approved, paid LinkedIn imports. Recruiter-authored jobs and held/rejected imports are preserved. Approval, payment, source, ownership and featured state are never overwritten. A concurrent updated_at change fails the update for retry.
- Identity is a canonical numeric HTTPS LinkedIn job URL. Named paths normalize to the numeric ID; query/hash are removed. Credentials, custom ports, other hosts and non-job paths are rejected.
- posted_at becomes created_at, the board's displayed/filter date. Existing known dates cannot move forward on refresh. Listing expiry is 90 days after the posting date, never 90 days after each import.
- The scraper defaults to a 90-day search, rechecks each posting date, and excludes explicit closed/expired jobs. The existing 100-applicant limit is retained.
- Full sync expires imported rows older than JOBS_SYNC_MAX_AGE_DAYS (default 90), using listing_expires_at rather than deleting rows.
- Liveness checks only request canonical LinkedIn job URLs and do not follow redirects. Only HTTP 404/410 or explicit closed content expires a job. Invalid URLs, redirects, throttling and server/network failures preserve the listing and count as inconclusive errors.
- Missing from one scrape does not prove a job is closed. Missing-from-payload expiry is disabled by default. If explicitly enabled, it requires a successful scrape/import, zero failed scrape requests, 25 or more source URLs and at least 80% coverage of the prior active set.

The public controls offer rolling Last 7 days, Last 30 days and Last 90 days. They combine with other filters and persist in URLs such as /?posted=90d&work=remote. The detailed dropdown retains Last 24 hours. Date windows only show active jobs; they do not revive closed listings.

## JSON batch schema

```json
[
  {
    "external_id": "linkedin-1234567890",
    "job_title": "ServiceNow Developer",
    "company_name": "Acme Corp",
    "location": "Bengaluru, India",
    "apply_url": "https://www.linkedin.com/jobs/view/1234567890",
    "job_description": "Full posting text...",
    "posted_at": "2026-09-01T00:00:00.000Z",
    "employment_type": "full_time",
    "experience_level": "mid",
    "work_mode": "hybrid",
    "job_type": "developer",
    "skills": ["JavaScript", "ServiceNow"],
    "modules": ["ITSM"],
    "certifications": []
  }
]
```

Required: title, company, apply URL, description and a valid non-future posted date. company_logo, company_website, taxonomy arrays and job_slug are optional. Store the full description available from the source; the application still sanitizes rendered rich text. Logo rendering remains restricted to trusted sources.

## Tuning

| Variable                              | Default                 | Purpose                                                               |
| ------------------------------------- | ----------------------- | --------------------------------------------------------------------- |
| SCRAPE_LINKEDIN_MAX_PAGES             | 3                       | Search pages per keyword.                                             |
| SCRAPE_LINKEDIN_PAGE_SIZE             | 25                      | Search offset stride; actual page size may differ.                    |
| SCRAPE_LINKEDIN_POSTED_WITHIN_SECONDS | 7776000                 | Standalone lookback; full sync aligns it with JOBS_SYNC_MAX_AGE_DAYS. |
| SCRAPE_LINKEDIN_MAX_APPLICANTS        | 100                     | Maximum reported applicant count.                                     |
| SCRAPE_LINKEDIN_TIMEOUT_MS            | 25000                   | Request timeout.                                                      |
| SCRAPE_LINKEDIN_DELAY_MS              | 1200                    | Request pacing.                                                       |
| SCRAPE_LINKEDIN_RETRY_MAX             | 2                       | Bounded retries.                                                      |
| SCRAPE_LINKEDIN_LOCATION              | India                   | Search location.                                                      |
| SCRAPE_LINKEDIN_OUTPUT_FILE           | data/linkedin-jobs.json | Standalone output; full sync uses INGEST_JOBS_FILE.                   |
| SCRAPE_LINKEDIN_SUMMARY_FILE          | unset                   | Standalone scrape summary.                                            |
| JOBS_SYNC_MAX_AGE_DAYS                | 90                      | Maintenance age cutoff.                                               |
| JOBS_SYNC_CHECK_APPLY_URLS            | 1                       | Set to 0 to skip direct checks.                                       |
| JOBS_SYNC_APPLY_CHECK_LIMIT           | 250                     | Maximum checks per run.                                               |
| JOBS_SYNC_APPLY_CHECK_DELAY_MS        | 800                     | Delay between liveness checks.                                        |
| JOBS_SYNC_ENABLE_MISSING_EXPIRY       | 0                       | Opt in to guarded missing-from-source expiry.                         |

## Scheduled operation

The [existing workflow](../.github/workflows/ingest-jobs.yml) schedules full maintenance at 06:00 UTC daily and supports manual dispatch. It serializes runs, allows 45 minutes and preserves failure diagnostics.

Configure SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and INGEST_RECRUITER_ID as GitHub secrets before re-enabling it. Run manual imports serially as well. Reconcile the remote migration history and stage the complete July hardening chain first; do not blindly replay the legacy May files into an empty database. See the [repository review](REPOSITORY_REVIEW_2026-09-06.md) and [security register](SECURITY_AUDIT.md).

A scheduled run refreshes the runner's dump and Supabase; it does not commit the JSON back to GitHub. A successful database import changes public_jobs without another frontend deployment. The new date controls require a frontend deployment.

Do not bulk approve historical held/rejected imports to populate the board. Review their moderation and source liveness individually.

## Data-quality limits

LinkedIn can return partial results and approximate relative dates. A complete run covers the configured queries/pages, not every LinkedIn vacancy. Unknown work mode currently defaults to remote, and seniority still relies on description heuristics; both are recorded as follow-up work. The internship matcher now distinguishes intern/internship from internal/international.

Preserve conservative pacing and bounded retries. Use an approved data source if access or coverage requirements exceed this workflow.
