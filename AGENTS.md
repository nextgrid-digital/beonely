# Beonely Repository Guide

This file is the operating guide for developers and coding agents working in this repository. Preserve the security boundaries below when changing the application.

## Product and stack

Beonely is a ServiceNow-focused job marketplace with public job discovery, candidate portfolios and applications, recruiter listing/payment workflows, and a staff administration console.

- Frontend: React 19, TypeScript, Vite, TanStack Router, TanStack Query, Tailwind CSS, shadcn/Radix components.
- Data and identity: Supabase Auth, PostgreSQL, Row Level Security, Storage, and security-definer RPCs.
- Server: Vercel TypeScript functions under `api/`.
- Payments: Razorpay Orders, Standard Checkout, signed webhooks, and database-backed fulfillment.
- Email: Resend transactional and marketing delivery, signed webhooks, suppression, and scheduled Vercel jobs.
- Validation and tests: Zod, Vitest browser tests, API Vitest tests, Playwright responsive checks, ESLint, TypeScript, Knip, and pnpm audit.

## Repository map

- `src/routes/`: TanStack file routes. `routeTree.gen.ts` is generated; do not hand-edit it.
- `src/features/`: product features grouped by public jobs, auth, candidate, recruiter, admin, and settings.
- `src/components/`: shared application and UI primitives.
- `src/context/`: auth, theme, direction, and admin workspace providers.
- `src/lib/`: API clients, Supabase client helpers, validation, formatting, and domain logic.
- `api/`: Vercel entrypoints. Keep entrypoints thin and put reusable code in `api/_handlers/` or `api/_lib/`.
- `supabase/migrations/`: ordered database, RLS, trigger, RPC, and Storage policy changes.
- `scripts/`: controlled ingestion and maintenance scripts.
- `e2e/`: Playwright responsive/accessibility checks.
- `docs/`: environment, deployment, ingestion, audit, and product documentation.
- `specs/`: Spec Kit product specifications and implementation plans.

## Local workflow

Use the package-manager version declared in `package.json`.

```bash
corepack enable
pnpm install
pnpm dev
```

`pnpm dev` starts the browser application only. For Vercel API routes, use `pnpm dev:local`, or run `pnpm dev:api` beside `pnpm dev`.

Before handing off a meaningful change, run:

```bash
pnpm lint
pnpm format:check
pnpm exec tsc --noEmit
pnpm typecheck:api
pnpm test
pnpm build
pnpm knip
pnpm audit --prod
```

For responsive behavior, also run `pnpm test:responsive`. Do not treat a successful build as a substitute for opening the built application and checking its console.

## Environment configuration

Copy `.env.example` to `.env`; never commit `.env` or real credentials.

- Browser-safe: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_PUBLIC_SITE_URL`, optional `VITE_TURNSTILE_SITE_KEY`, and `VITE_RAZORPAY_KEY_ID`.
- Server-only: `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, and `CRON_SECRET`.
- Admin identity must be configured in both `VITE_ADMIN_EMAIL_ALLOWLIST` for client routing and `ADMIN_EMAIL_ALLOWLIST` for server enforcement. The server list is authoritative.
- `HIRING_REQUEST_NOTIFICATION_EMAILS` controls operational lead notifications. Do not hard-code recipients.

No secret may use a `VITE_` prefix. Values with that prefix are compiled into the browser bundle.

## Security invariants

### Authentication and administration

- A client-side admin check is presentation only. Every privileged API handler must call `requireStaffAdmin`.
- Staff access requires a valid Supabase bearer token, confirmed email, server allowlist membership, an enabled recruiter row, and `role = 'admin'`.
- Cross-account jobs, recruiters, candidate profiles, applications, payments, hiring requests, audit records, and email data are read or changed through `/api/admin/*`, not directly from the browser Supabase client.
- The Supabase service-role key is server-only. Never expose it, log it, or use it from `src/`.
- Record privileged state changes in `admin_audit_log` when adding new moderation or account-control actions.

### RLS and public data

- RLS is mandatory on user and operational tables. Browser policies should be owner-only unless a narrowly documented public use case exists.
- Public job discovery reads `public.public_jobs`; never expose the base `jobs` row to anonymous clients because it contains recruiter contact data.
- Public portfolio responses come from `/api/public-portfolio`; private certificate objects are exposed only through short-lived signed URLs.
- Application resume assets come from `/api/application-asset` after server-side ownership or admin authorization.
- Avatars, company logos, resumes, and certificates must stay within their owner-scoped Storage paths and MIME/size limits.
- Add forward migrations. Do not rewrite a migration already applied to a shared environment unless repairing a never-deployed baseline is explicitly intended.

### Payments

- The server selects the amount and currency from an allowlisted plan. Never trust a browser-supplied amount.
- Reserve the payment row before creating a Razorpay order. Use the database receipt/idempotency key to recover from provider timeouts.
- Persist an immutable checkout snapshot: kind, plan, amount, currency, duration, and featured state.
- Verify signatures using the raw provider payload or the exact Razorpay payment/order tuple as applicable.
- Fulfill through the database RPC so payment capture and job activation/renewal/boost are atomic and replay-safe.
- A captured payment that cannot be safely fulfilled must remain visible for manual review; do not silently mark the job paid.
- Refund, dispute, and failure lifecycle events must update the payment record without reversing historical audit data.

### Email and marketing consent

- There is no arbitrary-recipient public email endpoint. Transactional triggers and payloads are server allowlisted.
- Use `dispatchTransactionalEmail` for transactional delivery. It atomically claims a dedupe key, supplies a provider idempotency key, and fences completion.
- Marketing subscription is double opt-in. Do not infer consent from account creation, applications, or historical data.
- `GET /api/unsubscribe` displays confirmation only; state mutation requires `POST`.
- Verify Resend webhook signatures over the raw body. Maintain bounce/complaint suppression and do not send to suppressed recipients.
- Campaign recipients are snapshotted before delivery; use stable per-recipient idempotency keys and resumable batches.
- Cron handlers must require `CRON_SECRET` and return a retryable failure when required delivery work fails.

### Inputs, redirects, and external resources

- Parse JSON with the bounded request helper and validate inputs with Zod.
- Apply database-backed rate limits to abuse-sensitive public and authenticated endpoints.
- Redirects must remain same-origin paths and reject protocol-relative paths, backslashes, and control characters.
- Public slugs are length/character constrained before database use.
- Do not fetch arbitrary user-provided URLs on the server. Company logos render only from the app-owned Storage path or explicitly trusted LinkedIn CDN hosts.
- Sanitize rich job descriptions before rendering. Keep `dangerouslySetInnerHTML` limited to reviewed, sanitized content.

## Database changes

Apply migrations in filename order. The July 2026 hardening chain is cumulative and must be deployed together, ending with `20260710300000_final_access_boundary.sql`.

The historical May migration chain is not a supported clean-database bootstrap: it contains legacy ordering assumptions and a duplicated `20260519120000` version provenance issue. Before applying changes to an existing project, reconcile that version against `supabase_migrations.schema_migrations`. Provision new database environments from a separately reviewed squashed baseline, not by replaying the current May files unchanged.

For a production rollout:

1. Back up the database and Storage metadata.
2. Reconcile the remote migration history and apply the July forward chain to a staging clone first.
3. Validate RLS using anonymous, candidate, recruiter, disabled-recruiter, admin-browser, and service-role sessions.
4. Reconcile pre-existing open/captured payment rows and any delivery rows left in `processing`.
5. Deploy API and frontend code only after the schema is ready.
6. Configure Razorpay and Resend webhook signing secrets and event subscriptions.
7. Smoke-test sign-up, application, listing checkout, webhook fulfillment, moderation, campaign delivery, unsubscribe, and private asset access.

## Admin console

Admin navigation and shell live in `src/features/admin/`; route entrypoints live under `src/routes/_authenticated/admin/`. The console is grouped into Overview, Marketplace, Growth, and Operations areas and includes dashboard metrics, job moderation, recruiter controls, candidate lookup, revenue lifecycle reporting, hiring leads, campaigns, email analytics, templates, automations, and test sends.

When adding an admin screen:

- Add the server handler and explicit router mapping first.
- Return the smallest necessary field projection.
- Fetch through `apiGet`/`apiSend` with the current access token.
- Use stable query keys that include the token/session boundary.
- Show loading, empty, and `AdminQueryError` states.
- Add the navigation item to `admin-nav.ts` and update its tests.
- Preserve keyboard navigation, focus visibility, semantic headings, and responsive overflow handling.

## Code conventions

- Prefer domain helpers to duplicated inline policy or formatting logic.
- Keep React providers that call router hooks inside `RouterProvider`.
- Surface database and provider errors; do not convert failures into successful empty responses.
- Use optimistic concurrency or database RPCs for state transitions that can race.
- Avoid check-then-insert delivery logic; claim work atomically.
- Remove unused demo/template code instead of hiding it from static analysis.
- Use `serverSiteOrigin()` for server-generated links and `publicSiteOrigin()` in the browser.
- Keep tests beside domain helpers or under `api/_tests/` for entrypoint behavior.

## Generated and operational artifacts

- `src/routeTree.gen.ts` is generated by the TanStack Router plugin.
- `dist/`, `test-results/`, `.vitest-attachments/`, local `.env`, and generated report page images are not source files.
- `docs/SECURITY_AUDIT.md` records the repository audit, severity, remediation, and deployment caveats.
- The detailed Word session report is an audit artifact, not application runtime input.
