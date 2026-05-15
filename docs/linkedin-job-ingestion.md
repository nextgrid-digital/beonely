# LinkedIn job ingestion

## What the product expects

- **`source_kind`**: set to `linkedin_import` when the row originated from LinkedIn (or your LinkedIn export pipeline). The public job page uses this (and the apply URL host) to show **Apply on LinkedIn** with the LinkedIn mark.
- **`apply_url`**: use the canonical LinkedIn job URL (typically `https://www.linkedin.com/jobs/view/...`). If the host is `linkedin.com` but `source_kind` was mis-set, the UI still treats it as LinkedIn apply when the URL matches.
- **`job_description`**: store the **full** posting body your pipeline can obtain. Prefer **plain text** (line breaks preserved) or **sanitized HTML** matching the recruiter editor (paragraphs, headings, lists, links). If you only have raw HTML from LinkedIn, strip tags / decode entities server-side before insert or update unless you normalize to the same allowed tag subset.

This app does **not** scrape LinkedIn from the browser (fragile, often blocked, and restricted by LinkedIn’s terms). Your worker, GitHub Action, or Codex automation should fetch or copy the full text and write it to Supabase via [`scripts/ingest-jobs.ts`](../scripts/ingest-jobs.ts).

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
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (CI / scripts only) |
| `INGEST_RECRUITER_ID` | UUID of `public.recruiters.id` used as owner for imported rows |
| `INGEST_JOBS_FILE` | Path to JSON array (default: `data/linkedin-jobs.json` if present) |
| `INGEST_JOB_DESCRIPTION` | Single demo row only, when no batch file |
| `INGEST_JOB_DESCRIPTION_FILE` | File path for demo description |

Run locally:

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... INGEST_RECRUITER_ID=... pnpm ingest:jobs
```

Upsert key: normalized `apply_url` (query stripped). Re-runs update title, description, and refresh `listing_expires_at` (+90 days).

### JSON schema (`data/linkedin-jobs.json`)

Each array element:

```json
{
  "external_id": "linkedin-1234567890",
  "job_title": "ServiceNow Developer",
  "company_name": "Acme Corp",
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

Required repository secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `INGEST_RECRUITER_ID`

Typical Codex loop:

1. Update `data/linkedin-jobs.json` (or add a scraper under `scripts/` in a follow-up PR).
2. Merge to `main` → workflow runs `pnpm ingest:jobs`.
3. LinkedIn section on `/` updates without a frontend redeploy (only data changes).

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
