# LinkedIn job ingestion

## What the product expects

- **`source_kind`**: set to `linkedin_import` when the row originated from LinkedIn (or your LinkedIn export pipeline). The public job page uses this (and the apply URL host) to show **Apply on LinkedIn** with the LinkedIn mark.
- **`apply_url`**: use the canonical LinkedIn job URL (typically `https://www.linkedin.com/jobs/view/...`). If the host is `linkedin.com` but `source_kind` was mis-set, the UI still treats it as LinkedIn apply when the URL matches.
- **`job_description`**: store the **full** posting body your pipeline can obtain. Prefer **plain text** (line breaks preserved) or **sanitized HTML** matching the recruiter editor (paragraphs, headings, lists, links). If you only have raw HTML from LinkedIn, strip tags / decode entities server-side before insert or update unless you normalize to the same allowed tag subset.

This app does **not** scrape LinkedIn from the browser (fragile, often blocked, and restricted by LinkedIn’s terms). Your worker, Zapier/Make step, or custom importer should fetch or copy the full text and write it to Supabase.

## Demo script: full description without editing TypeScript

[`scripts/ingest-jobs.ts`](../scripts/ingest-jobs.ts) accepts:

| Variable | Purpose |
|----------|---------|
| `INGEST_JOB_DESCRIPTION` | Entire description as a string (shell-quoted or env file). |
| `INGEST_JOB_DESCRIPTION_FILE` | Path to a UTF-8 text file whose contents become `job_description`. Takes precedence over `INGEST_JOB_DESCRIPTION` when set. |

If neither is set, a short default demo string is used.

## Fixing listings that already have a short snippet

Use **Admin → Moderation → Edit description** on each job to paste or format the full body (rich text), or run a one-off SQL / script update against `public.jobs.job_description` with the service role.
