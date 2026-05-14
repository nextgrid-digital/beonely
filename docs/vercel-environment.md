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

If keys were exposed, rotate them in Supabase first — see [supabase-key-rotation.md](supabase-key-rotation.md).
