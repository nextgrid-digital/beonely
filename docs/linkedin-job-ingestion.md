# LinkedIn job ingestion

## What the product expects

- **`source_kind`**: set to `linkedin_import` when the row originated from LinkedIn (or your LinkedIn export pipeline). The public job page uses this (and the apply URL host) to show **Apply on LinkedIn** with the LinkedIn mark.
- **`apply_url`**: use the canonical LinkedIn job URL (typically `https://www.linkedin.com/jobs/view/...`). If the host is `linkedin.com` but `source_kind` was mis-set, the UI still treats it as LinkedIn apply when the URL matches.
- **`job_description`**: store the **full** posting body your pipeline can obtain. Prefer **plain text** (line breaks preserved) or **sanitized HTML** matching the recruiter editor (paragraphs, headings, lists, links). If you only have raw HTML from LinkedIn, strip tags / decode entities server-side before insert or update unless you normalize to the same allowed tag subset.

This app does **not** scrape LinkedIn from the browser app. Use server-side scripts only:

- [`scripts/scrape-linkedin-jobs.ts`](../scripts/scrape-linkedin-jobs.ts) refreshes `data/linkedin-jobs.json`
- [`scripts/ingest-jobs.ts`](../scripts/ingest-jobs.ts) upserts JSON rows into Supabase
- [`scripts/sync-jobs-daily.ts`](../scripts/sync-jobs-daily.ts) runs scrape + ingest + stale imported job cleanup

## Public visibility (home page)

Imported jobs appear under **Roles from LinkedIn** on `/` when:

- `source_kind = linkedin_import`
- `approval_status = approved`
- `payment_status = paid`
- `listing_expires_at` is null or in the future

The ingest script sets **approved + paid** automatically (no Razorpay). Admins can still reject or feature listings in **Admin → Moderation**.

## Batch ingest

| Variable | Purpose |
|----------|---------|
| `SUPABASE_SERVICE_ROLE_KEY` | Same service role key already on Vercel for `/api` (never `VITE_*`) |
| `SUPABASE_URL` or `VITE_SUPABASE_URL` | Same Supabase project URL as the browser app |
| `INGEST_RECRUITER_ID` | Optional — UUID of a **dedicated system recruiter** used only for ingest metadata. Do not use a real hiring user's recruiter row; the recruiter portal lists only `source_kind = recruiter_posted` jobs. Defaults to your first `public.recruiters` row if unset. |
| `INGEST_JOBS_FILE` | Path to JSON array (default: `data/linkedin-jobs.json` if present) |
| `INGEST_JOB_DESCRIPTION` | Single demo row only, when no batch file |
| `INGEST_JOB_DESCRIPTION_FILE` | File path for demo description |

Run locally:

```bash
# From repo root with the same `.env` as local dev / Vercel:
pnpm ingest:jobs
```

Run scrape + ingest locally:

```bash
# Scrape LinkedIn guest endpoints to data/linkedin-jobs.json, then ingest to Supabase.
pnpm scrape:linkedin && pnpm ingest:jobs
```

Upsert key: normalized `apply_url` (query stripped). Re-runs update title, description, and refresh `listing_expires_at` (+90 days).
When present, `company_logo` and `company_website` are normalized to valid `http(s)` URLs. Existing non-empty logos are preserved unless a better non-favicon logo is discovered.

Run the full daily job maintenance locally:

```bash
# Scrape + ingest + stale-close cleanup in one command
pnpm sync:jobs
```

Stale cleanup policy (`pnpm sync:jobs`):

- checks imported jobs currently live in Supabase but missing from the latest scrape payload
- expires only rows with a close signal (`404/410` or close text such as “no longer accepting applications”)
- does not hard-delete rows
- leaves uncertain/blocked checks untouched for the next run

### JSON schema (`data/linkedin-jobs.json`)

Each array element:

```json
{
  "external_id": "linkedin-1234567890",
  "job_title": "ServiceNow Developer",
  "company_name": "Acme Corp",
  "company_logo": "https://media.licdn.com/dms/image/v2/....png",
  "company_website": "https://acme.example/careers",
  "location": "Remote, India",
  "apply_url": "https://www.linkedin.com/jobs/view/1234567890",
  "job_description": "Full posting text…",
  "employment_type": "full_time",
  "experience_level": "mid",
  "work_mode": "remote",
  "job_type": "developer",
  "skills": ["JavaScript", "ServiceNow"],
  "modules": ["ITSM"],
  "certifications": []
}
```

`job_slug` is optional; otherwise derived from `external_id` or `apply_url`.
`company_logo` and `company_website` are optional.

### Scraper tuning env vars (optional)

| Variable | Purpose | Default |
|----------|---------|---------|
| `SCRAPE_LINKEDIN_MAX_PAGES` | Search pages per keyword query | `3` |
| `SCRAPE_LINKEDIN_PAGE_SIZE` | Pagination stride (`start` offset increment) | `25` |
| `SCRAPE_LINKEDIN_TIMEOUT_MS` | Request timeout per HTTP request | `25000` |
| `SCRAPE_LINKEDIN_DELAY_MS` | Delay between outbound requests | `1200` |
| `SCRAPE_LINKEDIN_RETRY_MAX` | Retry count for transient failures | `2` |
| `SCRAPE_LINKEDIN_OUTPUT_FILE` | Output JSON path for scrape results | `data/linkedin-jobs.json` |

### Daily sync stale-check tuning (optional)

| Variable | Purpose | Default |
|----------|---------|---------|
| `JOBS_STALE_CHECK_MAX` | Max stale candidate URLs to verify per run | `120` |
| `JOBS_STALE_CHECK_TIMEOUT_MS` | Timeout per stale listing verify request | `12000` |
| `JOBS_STALE_CHECK_DELAY_MS` | Delay between stale listing verify requests | `700` |
| `JOBS_SYNC_SUMMARY_FILE` | Full sync summary JSON output path | unset |

### System recruiter (`INGEST_RECRUITER_ID`)

Create or pick a recruiter row in Supabase (SQL editor):

```sql
SELECT id, email, name FROM public.recruiters LIMIT 5;
```

Use that `id` as `INGEST_RECRUITER_ID` in GitHub Actions secrets and local runs.

## GitHub Actions / Codex automation

Workflow: [`.github/workflows/ingest-jobs.yml`](../.github/workflows/ingest-jobs.yml)

- **Schedule:** daily 06:00 UTC
- **Manual:** Actions → Ingest jobs → Run workflow
- **Pipeline:** `pnpm sync:jobs` (`scrape → ingest → stale-close cleanup`)

Required repository secrets (same Supabase project as Production on Vercel):

- `SUPABASE_SERVICE_ROLE_KEY` — copy from Vercel Production env
- `SUPABASE_URL` — same value as `VITE_SUPABASE_URL` on Vercel (scripts do not read `VITE_*` in GitHub Actions)
- `INGEST_RECRUITER_ID` — optional if you only have one recruiter row

Typical Codex loop:

1. Merge scraper or ingestion updates to `main`.
2. Workflow scrapes and refreshes `data/linkedin-jobs.json`.
3. Workflow ingests JSON into Supabase (`source_kind = linkedin_import`).
4. Workflow expires stale imported listings only when close signals are detected.
5. LinkedIn section on `/` updates without a frontend redeploy (only data changes).

## Legal / ToS note

LinkedIn explicitly states in `robots.txt` that automated access without express permission is prohibited, and their crawling terms require permission before automated crawling. Keep this scraper conservative:

- low request rate and bounded retries
- predictable schedule (no aggressive burst jobs)
- transparent user agent
- fail fast when blocked (`SCRAPE_SUMMARY` and workflow failure)

If LinkedIn enforcement increases, switch to an approved/licensed jobs data source before scaling.

## Legacy rows (pending / unpaid imports)

Older demo ingests may have `approval_status = pending` and `payment_status = unpaid`. They will not appear on `/` until backfilled:

```sql
UPDATE public.jobs
SET approval_status = 'approved',
    payment_status = 'paid',
    listing_expires_at = now() + interval '90 days'
WHERE source_kind = 'linkedin_import'
  AND approval_status = 'pending';
```

Admins can also approve `linkedin_import` jobs from **Admin → Moderation** even when payment is still `unpaid` (see app UI).

## Fixing short descriptions

Use **Admin → Moderation → Edit description** on each job to paste or format the full body (rich text), or run a one-off SQL / script update against `public.jobs.job_description` with the service role.
