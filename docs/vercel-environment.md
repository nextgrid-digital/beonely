# Vercel environment variables

Add these in the Vercel project → **Settings** → **Environment Variables** for **Production** and **Preview** as needed.

## Client (exposed in browser bundle — safe keys only)

| Name | Notes |
|------|--------|
| `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase **anon** JWT from Dashboard → API |
| `VITE_PUBLIC_SITE_URL` | Canonical site origin — production: `https://beonely.in` (no `www`). See [custom-domain-beonely-in.md](./custom-domain-beonely-in.md). |
| `VITE_RAZORPAY_KEY_ID` | Optional. Same value as `RAZORPAY_KEY_ID` (publishable **key id** only). If set, the client uses it for Checkout; if omitted, [`api/create-order`](../api/create-order.ts) still returns `keyId` from the server env so checkout works. **Never** put `RAZORPAY_KEY_SECRET` here or under any `VITE_*` name. |
| `VITE_TURNSTILE_SITE_KEY` | Optional Cloudflare Turnstile |
| `VITE_ADMIN_EMAIL_ALLOWLIST` | Comma-separated staff emails allowed to use `/admin` after sign-in at `/staff/sign-in` (must match `recruiters.role = admin`). Also set `ADMIN_EMAIL_ALLOWLIST` with the same values for documentation parity. |
| `VITE_GOOGLE_SITE_VERIFICATION` | Optional Google Search Console HTML-tag verification token. Paste only the `content` value from Google's `<meta name="google-site-verification" content="..." />` tag, then redeploy. |

If you use the **Supabase ↔ Vercel integration**, Supabase may sync **`SUPABASE_URL`** and **`SUPABASE_ANON_KEY`** instead of `VITE_*`. That is fine: the Vite build maps those into the browser bundle when `VITE_*` are not set. You still need **`VITE_PUBLIC_SITE_URL`** (or add it in Vercel) for correct canonical links and branded transactional email asset URLs.

Never add `SUPABASE_SERVICE_ROLE_KEY` or `sb_secret_*` with a `VITE_` prefix.

**Local payments:** Run **`pnpm dev:local`** (Vite + `vercel dev` on `127.0.0.1:3000`), or **`pnpm dev:api`** in a second terminal while **`pnpm dev`** runs, so `fetch('/api/create-order')` is proxied to the `api/` routes. See [README](../README.md). Checkout totals include **18% GST**; see [`src/lib/payments/plans.ts`](../src/lib/payments/plans.ts).

## Server-only (available to serverless `api/*`, not bundled for client)

| Name | Notes |
|------|--------|
| `SUPABASE_URL` | Same URL as above (or rely on `VITE_SUPABASE_URL` — see [`api/_lib/supabase.ts`](../api/_lib/supabase.ts)) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role JWT — **Dashboard only**, rotate if leaked |
| `SUPABASE_ANON_KEY` | Optional; API JWT verification can use `VITE_SUPABASE_ANON_KEY` instead |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Razorpay **server** credentials for [`api/create-order.ts`](../api/create-order.ts) and [`api/verify-payment.ts`](../api/verify-payment.ts). `KEY_ID` matches `VITE_RAZORPAY_KEY_ID` when both are set. Order amounts must match [`PLAN_AMOUNT_INR_PAISE`](../src/lib/payments/plans.ts) (base + 18% GST). |
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
