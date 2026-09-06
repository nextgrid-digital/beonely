# Production follow-up — 6 September 2026

The signed-in Edge session resolved the deployment-account mismatch. The active Vercel project is `nextgrids-projects/beonely`, serving `beonely.in`, and the production Supabase project is `qxqkfgiyuqoxthpnsmyo`. The other accessible CLI project, `zsw0rds-projects/beonely`, is not the live deployment.

## Database repair and job refresh

- Confirmed the July migrations were already recorded through `20260710300000_final_access_boundary`. The deployed `main` tree matched the local starting tree; earlier local remote-tracking refs and audit deployment notes were stale.
- Found 14 human-readable May policy names that survived the July chain. PostgreSQL combines permissive policies with OR, so the remaining approved/paid job policy exposed base job rows to signed-in users. Other old policies allowed cross-account admin access and bypassed newer insert/disabled-account restrictions.
- Applied and recorded the forward migration `20260906090000_remove_legacy_permissive_policies.sql` through the production Supabase SQL editor in Edge. It checks that the canonical owner policies and RLS exist, removes only the legacy policy names, and updates the view's explanatory comment. It does not change application records or Storage objects.
- Before applying it, exported all 17 public application tables, the policy/grant/view inventory, and metadata for all four Storage buckets. A subsequent responsive test run cleared its output directory, which mistakenly also contained these snapshots. The original policy/grant/view inventory was recoverable from the active session and is preserved with a policy rollback script in ignored `backups.local/2026-09-06/`. A new complete application-data and Storage-metadata snapshot was saved there at 13:14 UTC, **after** the policy repair and import. The original pre-import data snapshot is no longer available; production records were not deleted. These are application-data and access-metadata exports, not a full physical database, Auth, or media-object backup. They contain private information and must not be committed or shared.
- Reproduced the legacy exposure in an isolated PostgreSQL policy replica with synthetic users/data, then passed 20 checks covering anonymous, candidate, two recruiters, disabled recruiter, admin browser and service-role behavior, legitimate applications, impersonation denial, idempotency and rejection of incomplete baselines. `pnpm test:db` preserves these checks in CI.
- Production SQL verification found zero remaining legacy policies, no anonymous base-table SELECT privilege, redacted public contacts, zero candidate reads of base jobs/other profiles, and zero admin-browser reads of base jobs/payments. The admin can still see its own candidate profile, as intended. The import owner and service role retain access to their 788 job records.
- Imported the fresh 200-job dump: **156 inserted, 44 refreshed, 0 skipped, 0 failed**. The board then displayed **340 active jobs**, with newest listings dated **5 September**. Existing known posting dates were preserved, so fresh dump date counts need not equal database date counts.
- The user explicitly chose to retain existing import owner **theunnixe** for this refresh. That account also has three recruiter listings and six payment records. Import updates preserve ownership and commercial/moderation state; a separate import account remains a future improvement.

## Release status

The frontend release is being verified before publication. Git is configured as the user's `Zsw0rd` identity; Edge is signed into the user's `nextgrid-digital` account. No Codex co-author attribution is added.

Daily ingestion remains disabled until approval to store the existing service-role key in this repository's encrypted GitHub Actions secrets and enable the workflow. No credential values are included in source or reports.

## Remaining production configuration and product work

- Vercel has the Supabase URL/key, server admin allowlist, Razorpay API credentials and Resend API key. Its environment-variable list does not contain `RAZORPAY_WEBHOOK_SECRET`, `RESEND_WEBHOOK_SECRET` or `CRON_SECRET`. Provider webhook reconciliation and scheduled email work need the corresponding provider configuration; no payment, email, credential rotation or provider event was triggered during this follow-up.
- Supabase's advisor flags `public.public_jobs` as a security-definer view. That is intentional: it exposes only live approved/paid jobs from enabled recruiters and redacts contacts while the base table remains owner-only. Changing it to security-invoker would break anonymous discovery. The view and grants were checked directly rather than silencing the advisor.
- The historical May chain still cannot bootstrap a clean Supabase Preview database. The focused local policy replica does not certify the entire payment/email migration chain. A reviewed bootstrap baseline remains necessary for full staging automation.
- Atomic admin change/audit writes, campaign snapshot concurrency, and accurate work-mode/seniority metadata remain open source findings from the repository review.
- Production browser checks here cover public discovery and page behavior. Authenticated business workflows and real payment/email provider events still need dedicated integration verification.
