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

If you use the **Supabase ↔ Vercel integration**, Supabase may sync **`SUPABASE_URL`** and **`SUPABASE_ANON_KEY`** instead of `VITE_*`. That is fine: the Vite build maps those into the browser bundle when `VITE_*` are not set. You still need **`VITE_PUBLIC_SITE_URL`** (or add it in Vercel) for correct canonical links and branded transactional email asset URLs.

Never add `SUPABASE_SERVICE_ROLE_KEY` or `sb_secret_*` with a `VITE_` prefix.

**Local payments:** Run **`vercel dev`** (with this repo’s `api/` routes) alongside or instead of plain `pnpm dev` when testing Razorpay, so browser `fetch('/api/create-order')` reaches the serverless handlers. See the Beonely section in [README](../README.md).

## Server-only (available to serverless `api/*`, not bundled for client)

| Name | Notes |
|------|--------|
| `SUPABASE_URL` | Same URL as above (or rely on `VITE_SUPABASE_URL` — see [`api/_lib/supabase.ts`](../api/_lib/supabase.ts)) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role JWT — **Dashboard only**, rotate if leaked |
| `SUPABASE_ANON_KEY` | Optional; API JWT verification can use `VITE_SUPABASE_ANON_KEY` instead |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Razorpay **server** credentials for creating orders and verifying signatures in [`api/create-order`](../api/create-order.ts) and [`api/verify-payment`](../api/verify-payment.ts). `KEY_ID` is the same public key string as `VITE_RAZORPAY_KEY_ID` when you use both. |
| Other | Resend, Turnstile secret, Redis, etc. per [`.env.example`](../.env.example) |

After changing variables, **redeploy** so functions pick up new values.

`VITE_*` values are inlined at **Vite build** time. If you add or change them, trigger a new deployment so `pnpm build` runs again; restarting alone is not enough.

Serverless handlers under [`api/`](../api/) are typechecked on Vercel with [`api/tsconfig.json`](../api/tsconfig.json) (`moduleResolution: Bundler`, Node `process` / `crypto` types, path alias `@/*` → `src/`). If Vercel logs TypeScript errors only under `api/`, fix those files or this config and redeploy.

If keys were exposed, rotate them in Supabase first — see [supabase-key-rotation.md](supabase-key-rotation.md).

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

Sign-up uses `emailRedirectTo` = current origin + `/sign-in` (see [`sign-up-form.tsx`](../src/features/auth/sign-up/components/sign-up-form.tsx)). Supabase must allow that redirect.

In **Supabase Dashboard** → **Authentication** → **URL configuration**:

1. Set **Site URL** to your primary public origin (e.g. `https://beonely.vercel.app`).
2. Under **Redirect URLs**, add every origin path you use, e.g. `https://beonely.vercel.app/**` and `http://localhost:5173/**` for local dev. Add preview origins only if you test on preview URLs.

If the confirmation redirect is not allowed, Supabase may show an error page instead of completing sign-in.

## Branded Supabase Auth emails (optional, dashboard)

Signup confirmation and password-reset emails sent by **Supabase** (not the Resend code in this repo) are customized in the Supabase project:

- **Authentication** → **Emails** — edit subjects and HTML templates.
- For a custom **From** domain and full control: configure **custom SMTP** (e.g. Resend) under **Project Settings** → **Auth** and point templates at your brand.

## Transactional email (Resend, serverless)

Payment receipts use [`sendTransactionalEmail`](../api/_lib/resend.ts) with **`RESEND_API_KEY`** and **`RESEND_FROM_EMAIL`** (verified domain). HTML is built with [`beonelyTransactionalHtml`](../api/_lib/email-layout.ts) for a consistent Beonely shell (logo uses `VITE_PUBLIC_SITE_URL` + `/images/beonely-logo.png` when set).
