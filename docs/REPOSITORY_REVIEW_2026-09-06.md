# Repository review — 6 September 2026

The repository has strong source-level boundaries around administration, payments and private assets. This review fixed additional import, search and dependency defects and added rolling job-date filters. Publishing the refreshed jobs and deploying the interface remain dependent on the correct production configuration. Local changes are not evidence of a production rollout.

**Updated after signed-in Edge access:** the [production follow-up](PRODUCTION_RELEASE_2026-09-06.md) records the correct deployment, the repair of 14 surviving legacy database policies, and the successful import of all 200 jobs. It supersedes the initial production-access limitations in this review.

## Application map

| Area          | How it works                                                                                                                                                                                          | Main boundary                                                                                              |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Public jobs   | `/` merges recruiter listings and LinkedIn imports in 25-row pages. `/jobs/$slug` and the peek fetch full descriptions separately. Search and filters live in URL parameters and TanStack Query keys. | Reads use `public_jobs`; the underlying `jobs` table contains private recruiter fields.                    |
| Candidates    | Supabase authentication, profile/resume builder, saved jobs, applications and public portfolios.                                                                                                      | RLS owns drafts; server asset/portfolio endpoints validate access and issue short-lived URLs.              |
| Recruiters    | Owner-scoped listing drafts, listing plans, Razorpay checkout, applicant pipeline and renewals.                                                                                                       | Browser state cannot authorize payment, publish jobs or change privileged fields.                          |
| Staff         | Overview, marketplace moderation, growth/email and operations screens.                                                                                                                                | `/api/admin/*` checks bearer identity, confirmed email, server allowlist and enabled admin recruiter role. |
| Payments      | The server reserves an immutable checkout snapshot and verifies provider orders, captures and signed webhooks.                                                                                        | Database fulfillment RPCs serialize changes, prevent replay and retain manual-review cases.                |
| Email         | Transactional dedupe/claims, marketing confirmation, suppression, recipient snapshots and scheduled delivery.                                                                                         | Allowlisted triggers, raw-body signatures, provider idempotency and authenticated cron endpoints.          |
| Job ingestion | Node scripts scrape LinkedIn guest search/detail pages, normalize data and write an atomic JSON dump; a separate service-role importer writes jobs.                                                   | Credentials remain outside Vite; imports must preserve staff decisions and recruiter-owned records.        |
| Deployment    | Vite/TypeScript frontend and consolidated Vercel functions; GitHub Quality and Ingest jobs workflows.                                                                                                 | Supabase migration history must be reconciled before schema-dependent code is released.                    |

The July migration chain is cumulative. The historical May chain is not a reliable empty-database bootstrap; its ordering/version issues remain a release dependency. No applied migration was rewritten during this review.

## Changes made

- Added visible **Any time / Last 7 days / Last 30 days / Last 90 days** shortcuts. These use the existing `posted` URL parameter, work with other filters and are synchronized with the detailed dropdown. The existing 24-hour option remains available there.
- Fixed the detailed filter panel extending below small phone screens. Phones now use a scrollable sheet; desktop popovers respect the available height. Select controls have accessible names.
- Added the 90-day server query cutoff and validation for recognized date tokens. Windows are rolling elapsed periods, as requested. Existing recruiter/featured ordering remains; an ID tie-breaker makes equal-date pagination deterministic.
- Expanded the scraper and default retention window to 90 days. Expired/closed jobs remain excluded; a 90-day filter does not revive a closed vacancy.
- Required known, non-future posting dates. Listing expiry is calculated from that posting date; refreshing an existing row cannot move its known date forward.
- Prevented reimports from changing approval, payment, source, ownership or featured state. Existing non-approved/non-paid imports and recruiter-authored jobs are skipped. Updates also check `updated_at` to detect concurrent changes.
- Required an explicit import recruiter and removed the automatic first-recruiter/demo fallback. Added a credential-free `pnpm ingest:jobs --dry-run` and validation of the complete batch before the first database write.
- Loaded optional local `.env` files without overriding environment variables. Daily sync invokes Node directly on Windows, shares one scrape/import file path and reads summaries unique to that run.
- Daily sync now fails visibly on partial errors, skips cleanup after a failed pipeline, paginates imported rows and serializes GitHub workflow runs. Disabled missing-from-scrape expiry is a normal skip, not an operational failure.
- Restricted liveness requests to canonical HTTPS LinkedIn job URLs and disabled automatic redirects. Untrusted URLs, throttling, redirects and server errors cannot be mistaken for closed vacancies.
- Fixed punctuation escaping in public title/company search and escaped SQL LIKE metacharacters in location filters.
- Fixed the scraper's substring match that treated “internal” and “international” as “intern” and incorrectly assigned part-time employment.
- Updated Tiptap to 3.30.4, aligned its optional menu peers and ProseMirror types, and patched the vulnerable transitive fflate release.

## Findings and remaining work

| ID   | Severity               | Finding and impact                                                                                                                                                                                                                                        | Status                                                                                                                                             |
| ---- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| S-01 | Moderate               | Tiptap's attribute merging advisory and fflate's malformed ZIP64 infinite-loop advisory affected installed production dependencies. Presence of a vulnerable package does not establish exploitation in this application.                                 | Fixed; production dependency audit is clean.                                                                                                       |
| S-02 | High                   | Import refreshes previously matched any job with the same apply URL and wrote `approved`, `paid` and `linkedin_import`. A refresh could reverse moderation or overwrite a recruiter job's commercial/source state.                                        | Fixed in importer; no production import executed.                                                                                                  |
| S-03 | Medium                 | The maintenance liveness checker fetched database URLs without validating the target and followed redirects, exposing the trusted process to arbitrary destinations if bad legacy data existed.                                                           | Fixed; invalid hosts and redirects are covered by regression tests.                                                                                |
| S-04 | Medium                 | The local CLI did not load `.env`; Windows could not launch `pnpm.cmd` without a shell; stale summaries and mismatched output paths could report or process the wrong run; partial failures exited successfully.                                          | Fixed in source/workflow. Remote workflow still disabled and unconfigured.                                                                         |
| S-05 | Medium                 | Reimports extended expiry from the import date, invalid dates could become database “now,” and cleanup removed every import older than 30 days. These undermine freshness and the requested 90-day view.                                                  | Fixed in source. Existing expired rows require an observed, still-open source posting before reimport.                                             |
| S-06 | Low                    | Commas, quotes and parentheses in a search term could break or alter the raw PostgREST OR expression. This is a query-construction defect, not a demonstrated RLS bypass or SQL injection.                                                                | Fixed; punctuation, wildcards and date combinations tested.                                                                                        |
| S-07 | Medium                 | `api/_handlers/admin/jobs.ts` and `recruiters.ts` update records, then ignore the result of inserting `admin_audit_log`. A failed audit write is reported as success, and the two writes are not atomic.                                                  | Open. Move the state change and audit insert into a service-only database RPC, then test rollback and concurrency in staging.                      |
| S-08 | Medium                 | `snapshotCampaignAudience()` inserts recipients while the campaign remains editable as `draft`, then changes status. Concurrent sending/editing can cause snapshot/content disagreement; provider idempotency alone does not lock this preparation phase. | Open. Claim a preparation state atomically and freeze content before snapshotting; add concurrent integration tests before expanding campaign use. |
| S-09 | Medium                 | `normalizeWorkMode()` defaults unknown jobs to remote, while experience is inferred from the complete description. Terms such as “staff” or “junior” in duties can mislabel seniority.                                                                    | Open data-quality work. Parse structured source fields and support an explicit “not specified” state rather than asserting remote eligibility.     |
| S-10 | Operational            | GitHub reports `Ingest jobs` as `disabled_manually`; `gh secret list` returns no repository secrets. The linked `zsw0rds-projects/beonely` project has no production environment variables. The local `.env` has no Supabase configuration.               | Awaiting correct deployment/database configuration. Do not enable a knowingly unconfigured schedule.                                               |
| S-11 | Informational          | GitHub reports `nextgrid-digital/beonely` as public; the README said it was private. A source license does not set repository visibility.                                                                                                                 | Documentation corrected. Visibility remains unchanged; owner should confirm the intended access policy.                                            |
| S-12 | High, previous finding | August's audit reported anonymous access to base job contact fields and missing production hardening. This review verified the current live UI but did not establish the current database policy state.                                                   | Carried forward for verification, not asserted as a newly reproduced exposure. Reconcile migrations and run the full role matrix before release.   |

The responsive checks also reproduced an offscreen date dropdown on iPhone SE. This is fixed with the mobile sheet and covered by selecting the 90-day option on all three viewports.

Advisory references: [Tiptap GHSA-cp6q-959q-f8rh](https://github.com/advisories/GHSA-cp6q-959q-f8rh), [fflate GHSA-px8p-9vwx-vf98](https://github.com/advisories/GHSA-px8p-9vwx-vf98). Search quoting follows [PostgREST URL grammar](https://docs.postgrest.org/en/stable/references/api/url_grammar.html#reserved-characters).

## Jobs and deployment

The live board was opened on 6 September and displayed 183 jobs, with its first listings dated 15 August. The final scrape after the employment-classification fix checked 287 distinct detail pages across 12 searches/36 search requests and retained **200 unique listings** dated 8 July–5 September: **101 within 7 days, 191 within 30 days, 200 within 90 days** at validation time. One HTTP 429 recovered on retry; no requests remained failed. The complete dump passed the import dry run. Search results changed between runs, so this final batch supersedes the initial 207-job scrape.

The JSON dump is an input to ingestion, not a frontend data source. Replacing it does not change Supabase or the live site. The local preview intentionally shows the missing-data-service notice because no Supabase client variables are configured.

To finish the requested live update:

1. Identify the actual Vercel production project serving `beonely.in` and its matching Supabase project. The accessible project named `beonely` currently has no production variables; do not assume it is the active deployment.
2. Reconcile/stage the migration chain and verify anonymous, candidate, recruiter, disabled-recruiter, admin-browser and service-role permissions.
3. Configure local/server Supabase credentials and `INGEST_RECRUITER_ID` for an enabled dedicated system recruiter. Keep credentials out of source and chat.
4. Validate the fresh dump with `pnpm ingest:jobs --dry-run`, import it with `pnpm ingest:jobs`, and verify counts and date windows through `public_jobs`.
5. Deploy the tested frontend/API from the intended branch after the schema is ready. The date UI needs a frontend deployment; future job refreshes need only the import.
6. Configure GitHub secrets and re-enable the existing daily workflow. Monitor its real success/partial-failure result.

## Recommended upgrades, in order

1. **Make freshness observable.** Store import-run status, counts, source coverage and last success; show “Updated …” on the board and highlight failed/stale runs in admin. This addresses the current silent stale-feed problem.
2. **Improve job metadata before adding more volume.** Add “not specified” fields, extract structured employment/seniority/location, detect near-duplicate company/title/location postings and let candidates report closed or inaccurate jobs.
3. **Complete operational integrity.** Implement atomic moderation/audit and campaign preparation RPCs, review payment manual-review cases and test all migrations in a supported staging baseline.
4. **Add saved searches and opt-in alerts.** Reuse URL filters and the existing double-opt-in/deduped email infrastructure. Let candidates choose cadence and unsubscribe easily.
5. **Improve discovery at scale.** Profile database requests, add suitable search indexes and eventually cursor pagination. Track search-to-open-to-apply conversion before changing ranking.

## Verification and limits

- Full browser suite: 59 files / 294 tests passed. API/script suite and additional import preflight tests passed; final counts are recorded in `SECURITY_AUDIT.md`.
- Desktop/iPhone SE/iPhone 14 responsive suite: 28 passed, 2 intentional desktop skips. Date controls preserve search, survive reload and do not overflow these viewports; the detailed date dropdown is usable on each viewport.
- Production build, app/API typechecks, script typechecking, formatting and Knip were run. ESLint has 0 errors and 23 existing Fast Refresh warnings.
- After resolving editor dependency version mismatches, focused editor/sanitizer/date tests and the production build passed. No remaining peer dependency issues or known production audit vulnerabilities.
- The built application was opened in the in-app browser: the 90-day button updated the URL, the detailed dropdown showed the same selection, and the console had no warnings/errors.
- Read-only live-site/GitHub/Vercel checks were performed. No database migration, production data write, email, payment, repository visibility change, commit, push or deployment was performed.
- This is a source review plus automated and browser verification, not proof of the absence of all vulnerabilities. Populated authenticated workflows, real provider events, current production RLS and concurrency behavior still require staging/database access.
