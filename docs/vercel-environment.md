# Vercel environment variables

Add these in the Vercel project → **Settings** → **Environment Variables** for **Production** and **Preview** as needed.

## Client (exposed in browser bundle — safe keys only)

| Name | Notes |
|------|--------|
| `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase **anon** JWT from Dashboard → API |
| `VITE_PUBLIC_SITE_URL` | Canonical site origin, e.g. `https://your-domain.com` |
| `VITE_RAZORPAY_KEY_ID` | Optional. Same value as `RAZORPAY_KEY_ID` (publishable **key id** only). If set, the client uses it for Checkout; if omitted, [`api/create-order`](../api/create-order.ts) still returns `keyId` from the server env so checkout works. **Never** put `RAZORPAY_KEY_SECRET` here or under any `VITE_*` name. |
| `VITE_TURNSTILE_SITE_KEY` | Optional Cloudflare Turnstile |
| `VITE_ADMIN_EMAIL_ALLOWLIST` | Comma-separated staff emails allowed to use `/admin` after sign-in at `/staff/sign-in` (must match `recruiters.role = admin`). Also set `ADMIN_EMAIL_ALLOWLIST` with the same values for documentation parity. |

If you use the **Supabase ↔ Vercel integration**, Supabase may sync **`SUPABASE_URL`** and **`SUPABASE_ANON_KEY`** instead of `VITE_*`. That is fine: the Vite build maps those into the browser bundle when `VITE_*` are not set. You still need **`VITE_PUBLIC_SITE_URL`** (or add it in Vercel) for correct canonical links and branded transactional email asset URLs.

Never add `SUPABASE_SERVICE_ROLE_KEY` or `sb_secret_*` with a `VITE_` prefix.

**Local payments:** Run **`pnpm dev:local`** (Vite + `vercel dev` on `127.0.0.1:3000`), or **`pnpm dev:api`** in a second terminal while **`pnpm dev`** runs, so `fetch('/api/create-order')` is proxied to the `api/` routes. See [README](../README.md). Checkout totals include **18% GST**; see [`src/lib/payments/plans.ts`](../src/lib/payments/plans.ts).

## Server-only (available to serverless `api/*`, not bundled for client)

| Name | Notes |
|------|--------|
| `SUPABASE_URL` | Same URL as above (or rely on `VITE_SUPABASE_URL` — see [`api/_lib/supabase.ts`](../api/_lib/supabase.ts)) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role JWT — **Dashboard only**, rotate if leaked |
| `SUPABASE_ANON_KEY` | Optional; API JWT verification can use `VITE_SUPABASE_ANON_KEY` instead |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Razorpay **server** credentials for [`api/create-order`](../api/create-order.ts) and [`api/verify-payment`](../api/verify-payment.ts). `KEY_ID` matches `VITE_RAZORPAY_KEY_ID` when both are set. Order amounts must match [`PLAN_AMOUNT_INR_PAISE`](../src/lib/payments/plans.ts) (base + 18% GST). |
| Other | Resend, Turnstile secret, Redis, etc. per [`.env.example`](../.env.example) |

After changing variables, **redeploy** so functions pick up new values.

## Production checklist: `/api` and recruiter checkout

On Vercel, [`api/create-order.ts`](../api/create-order.ts) and [`api/verify-payment.ts`](../api/verify-payment.ts) run as **serverless functions** on the same origin as the static app — no local `vercel dev` or Vite proxy is involved. Confirm **Production** (and **Preview**, if you test there) has at least:

| Priority | Variable | Notes |
|----------|----------|--------|
| Required | `SUPABASE_SERVICE_ROLE_KEY` | Service role JWT for server-side Supabase ([`api/_lib/supabase.ts`](../api/_lib/supabase.ts)). |
| Required | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Razorpay Standard Checkout ([`api/create-order.ts`](../api/create-order.ts), [`api/verify-payment.ts`](../api/verify-payment.ts)). |
| Required | Supabase URL + anon for API auth | `SUPABASE_URL` **or** `VITE_SUPABASE_URL`, and `SUPABASE_ANON_KEY` **or** `VITE_SUPABASE_ANON_KEY` — used when validating the user JWT on `/api/*`. |
| Strongly recommended | `VITE_PUBLIC_SITE_URL` | Production origin for links and email assets ([`api/_lib/email-layout.ts`](../api/_lib/email-layout.ts)). |
| Optional | `VITE_RAZORPAY_KEY_ID` | Same publishable key id as `RAZORPAY_KEY_ID` if you want it in the client bundle; server can still return `keyId` without it. |

**Turnstile:** If **`TURNSTILE_SECRET_KEY`** is set ([`api/_lib/turnstile.ts`](../api/_lib/turnstile.ts)), `POST /api/create-order` expects a **`turnstileToken`** in the JSON body. The recruiter **Pay with Razorpay** flow ([`src/lib/payments/razorpay-job-checkout.ts`](../src/lib/payments/razorpay-job-checkout.ts)) does not send that field today. For checkout to work, either **omit** `TURNSTILE_SECRET_KEY` in Vercel, or extend the pay flow to collect a token before calling `create-order`.

**Rate limits:** API routes use a no-op limiter so the serverless bundle stays small on Vercel. Optional `UPSTASH_REDIS_*` env vars from earlier setups are ignored by the app; use Vercel WAF or Edge Middleware if you need IP throttling.

**Email:** `RESEND_API_KEY` + `RESEND_FROM_EMAIL` for app transactional email ([`api/_lib/resend.ts`](../api/_lib/resend.ts)) — admin test send, payment receipts, job/application notifications, campaigns. Example from address: `Beonely <team@beonely.in>`.

### Resend already in Supabase?

Signup and password-reset mail is sent by **Supabase Auth** (Authentication → Emails, or custom SMTP in the Supabase dashboard). That is **separate** from the Vercel `/api/*` Resend integration:

| Path | Where to configure | Used for |
|------|-------------------|----------|
| Supabase Auth | Supabase dashboard | Sign-up, password reset, email confirmation |
| Vercel API | `RESEND_API_KEY` + `RESEND_FROM_EMAIL` on the Vercel project (and `.env.local` for `pnpm dev:local`) | Admin test send, receipts, moderation/application emails, marketing |

Reuse the same Resend API key on Vercel; redeploy after adding or changing env vars.

### Email templates (admin)

Marketing and transactional template previews live in **`email_templates`** (migration `supabase/migrations/20260520120000_email_templates.sql`). Apply with `supabase db push` on the linked project. Staff manage templates under **Admin → Email → Templates**; campaigns use the wizard at **Admin → Email → Campaigns → New campaign**. Template CRUD is staff-only via `/api/admin/email/templates` (service role).

## Smoke test after deploy

1. Open your **production** site URL (use Preview only if its env vars match what you need).
2. Sign in as a **recruiter**, go to **My jobs**, use **Pay & submit** → **Pay with Razorpay** (or the featured upgrade flow).
3. Open DevTools → **Network**, trigger payment start, and find **`POST …/api/create-order`**. Expect **HTTP 200** and JSON including `orderId`, `amount`, `currency`, and `keyId`.
4. If the request fails: **401** → auth/session or anon key mismatch; **400** with `turnstile_failed` → see Turnstile note above; **502** / timeout / **5xx** → **Vercel → Project → Logs** (or Runtime Logs) for `/api/create-order` and fix missing env or handler errors.
5. **Public job board:** After `verify-payment` succeeds, the job is **paid** but still **pending approval**. In **Admin → Moderation**, approve the listing so it appears on `/` and `/jobs/:slug` for candidates (`approval_status` must be `approved`).

## Troubleshooting: "Invalid JSON from server" and `FUNCTION_INVOCATION_FAILED`

Symptoms: the browser or [`apiPost`](../src/lib/api-client.ts) shows **Invalid JSON from server (500)** and the response body snippet mentions **`FUNCTION_INVOCATION_FAILED`** or looks like HTML.

Cause: Vercel ran the `/api/*` function but it **crashed or timed out before sending JSON** (Vercel’s generic HTML error page is not valid JSON).

Fix:

1. **Deployments** — open the failing deployment and confirm the **commit SHA** matches the branch you expect (e.g. includes the latest `api/` fixes). Redeploy after env or code changes.
2. **Vercel → Project → Logs** — filter by `/api/create-order` or `/api/verify-payment`, expand the entry, and copy the **first error line / stack** (e.g. `Error:`, `Cannot find module`, OOM). Missing Razorpay keys alone usually return **JSON** (`payments_not_configured`), not this HTML page — HTML means the isolate failed before a normal JSON response.
3. Confirm **Production** environment variables from the checklist above, especially **`SUPABASE_SERVICE_ROLE_KEY`**, Supabase **URL + anon** for JWT validation, and **`RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`**.
4. **Redeploy** after changing env vars.

When misconfiguration is limited to **missing service role or Supabase URL**, the API now responds with **503** and JSON `{ "error": "server_misconfigured", ... }` instead of throwing (see [`tryGetServiceSupabase`](../api/_lib/supabase.ts) in [`create-order`](../api/create-order.ts) and [`verify-payment`](../api/verify-payment.ts)). Other startup failures may still surface as HTML until fixed in logs.

## Razorpay Dashboard (test or live)

1. **API keys:** [Dashboard](https://dashboard.razorpay.com/) → **Settings → API Keys** — use **Key ID** + **Key secret** in Vercel / local `.env` (never commit secrets).
2. **Standard Web Checkout:** Works with the existing order + `checkout.js` flow; no separate “Payment Page” product is required for this integration.
3. **Webhooks:** Optional for this app — confirmation is via client `POST /api/verify-payment` after success. [`api/razorpay-webhook.ts`](../api/razorpay-webhook.ts) is intentionally unused (410).
4. **Live mode:** After KYC, switch to **live** keys in production env vars.

`VITE_*` values are inlined at **Vite build** time. If you add or change them, trigger a new deployment so `pnpm build` runs again; restarting alone is not enough.

Serverless handlers under [`api/`](../api/) are typechecked on Vercel with [`api/tsconfig.json`](../api/tsconfig.json) (`moduleResolution: Bundler`, Node `process` / `crypto` types, path alias `@/*` → `src/`). If Vercel logs TypeScript errors only under `api/`, fix those files or this config and redeploy.

If keys were exposed, rotate them in Supabase first — see [supabase-key-rotation.md](supabase-key-rotation.md).

## Troubleshooting: PostgREST "schema cache" / missing column on `applications`

Symptoms: Beonely **Apply** fails with an error like **Could not find the `candidate_user_id` column of `applications` in the schema cache** (or another column name).

Cause: the **remote Supabase project** backing `VITE_SUPABASE_URL` is out of date versus this repo’s migrations (table exists but without newer columns, or DDL not applied to that project).

Fix:

1. In Supabase → **SQL Editor**, list columns:  
   `select column_name from information_schema.columns where table_schema = 'public' and table_name = 'applications' order by ordinal_position;`
2. If `candidate_user_id` (or `resume_structured_snapshot`) is missing, apply migrations to **that** project — e.g. CLI `supabase db push` linked to the project, or run the SQL from [`supabase/migrations/20260516120000_applications_recruiter_pipeline.sql`](../supabase/migrations/20260516120000_applications_recruiter_pipeline.sql) and optionally [`20260516140000_applications_resume_structured_snapshot.sql`](../supabase/migrations/20260516140000_applications_resume_structured_snapshot.sql) in the SQL Editor.
3. Hard-refresh the app and retry apply (PostgREST usually picks up new columns immediately).

## Troubleshooting: company logo upload fails on production

Symptoms: recruiter **Upload logo** toast mentions missing **`job-logos`** bucket, or upload returns a storage error.

Cause: the Supabase project behind **`VITE_SUPABASE_URL`** is missing the **`job-logos`** bucket, **`company_logo`** column on **`jobs`**, or storage policies from [`supabase/migrations/20260517120000_job_company_logos_storage.sql`](../supabase/migrations/20260517120000_job_company_logos_storage.sql).

Fix:

1. Confirm **`VITE_SUPABASE_URL`** for **Production** on Vercel is `https://<project-ref>.supabase.co` for the same project where migrations were applied (Beonely production uses one project for app + DB).
2. In Supabase → **Storage**, verify bucket **`job-logos`** exists and is **public**.
3. In SQL Editor, verify column:  
   `select column_name from information_schema.columns where table_schema = 'public' and table_name = 'jobs' and column_name = 'company_logo';`
4. If missing, run the migration SQL file above (or `supabase db push` linked to that project).
5. **Redeploy** the Vercel **Production** deployment so the app bundle includes recruiter edit + logo UI ([`recruiter-job-editor-page.tsx`](../src/features/recruiter/recruiter-job-editor-page.tsx)). Logo upload is client-side to Supabase Storage; no new Vercel server env vars are required beyond existing Supabase keys.

## Troubleshooting: “Supabase is not configured” or empty jobs on the live site

Symptoms: toast **Supabase is not configured** on sign-in/sign-up, or the public jobs list is empty while localhost works.

Cause: the production bundle was built without **`VITE_SUPABASE_URL`** and **`VITE_SUPABASE_ANON_KEY`** (wrong name, only set for Preview but not Production, or variables added after the last build). [`getSupabaseConfigured()`](../src/lib/supabase/client.ts) is false and [`fetchPublishedJobs`](../src/lib/jobs/fetch-published-jobs.ts) returns no rows.

Fix:

1. Vercel → **Settings** → **Environment Variables** — set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for **Production** (and Preview if you use it). Use the same Supabase project as local `.env` unless you intend a separate database.
2. Set **`VITE_PUBLIC_SITE_URL`** to your canonical origin (e.g. `https://beonely.vercel.app`).
3. **Redeploy** Production from the Deployments tab (or push a commit) so a new build runs.
4. Hard-refresh the browser or use a private window.

After deploy, DevTools → **Network** should show requests to `*.supabase.co` when loading jobs or signing in.

Builds on Vercel (`VERCEL=1`) **fail fast** if those two `VITE_*` variables are missing — see [`vite.config.ts`](../vite.config.ts) — so a green Vercel build implies they were present at build time.

## External testers and Vercel Deployment Protection

If someone says they clicked an email link and were asked to **log in to Vercel**, the deployment they landed on is almost certainly protected by **Deployment Protection** (Vercel Authentication / Standard Protection). Only team members can open that URL; everyone else gets the Vercel login screen.

**What to do:**

1. Vercel → your project → **Settings** → **Deployment Protection**.
2. For **Production** URLs you share publicly (e.g. `https://beonely.vercel.app`), ensure visitors are **not** required to authenticate with Vercel unless you intend that.
3. For **Preview** deployments, either disable protection for previews used by testers, use **Protection Bypass** (e.g. bypass token in the URL), or only send testers the **production** URL.

Give testers the **same unprotected URL** you expect real candidates to use.

## Supabase Auth URL configuration (email confirmation)

**Site URL** is the default origin Supabase uses when building magic links and auth emails. If it still points at an old Vercel project URL (for example `https://<old>-projects.vercel.app`), users will see that hostname in the email even when they triggered the flow from another deployment. Set **Site URL** to your real canonical origin (same idea as **`VITE_PUBLIC_SITE_URL`**) and keep **Redirect URLs** in sync.

Sign-up uses `emailRedirectTo` = current origin + `/sign-in` (see [`sign-up-form.tsx`](../src/features/auth/sign-up/components/sign-up-form.tsx)). Password reset uses current origin + `/reset-password` (see [`forgot-password-form.tsx`](../src/features/auth/forgot-password/components/forgot-password-form.tsx)). Supabase must allow those redirects.

In **Supabase Dashboard** → **Authentication** → **URL configuration**:

1. Set **Site URL** to your primary public origin (e.g. `https://beonely.vercel.app`).
2. Under **Redirect URLs**, add every origin path you use, e.g. `https://beonely.vercel.app/**` and `http://localhost:5173/**` for local dev. Add preview origins only if you test on preview URLs. Keep an old default Vercel URL here only while old email links must still work; remove it once traffic has moved.

If the confirmation redirect is not allowed, Supabase may show an error page instead of completing sign-in.

## Branded Supabase Auth emails (optional, dashboard)

Signup confirmation and password-reset emails sent by **Supabase** (not the Resend code in this repo) are customized in the Supabase project:

- **Authentication** → **Emails** — edit subjects and HTML templates.
- For a custom **From** domain and full control: configure **custom SMTP** (e.g. Resend) under **Project Settings** → **Auth** and point templates at your brand.

## Transactional email (Resend, serverless)

Payment receipts use [`sendTransactionalEmail`](../api/_lib/resend.ts) with **`RESEND_API_KEY`** and **`RESEND_FROM_EMAIL`** (verified domain). HTML is built with [`beonelyTransactionalHtml`](../api/_lib/email-layout.ts) for a consistent Beonely shell (logo uses `VITE_PUBLIC_SITE_URL` + `/images/beonely-logo.svg` when set).
