# Custom domain: beonely.in (canonical, no www)

Production canonical origin: **`https://beonely.in`** (apex only).  
`www.beonely.in` must permanently redirect to the apex.

## DNS

At your registrar (or after moving nameservers to Vercel):

| Host | Type | Value |
|------|------|--------|
| `@` | `A` | `76.76.21.21` |
| `www` | `CNAME` | `cname.vercel-dns.com` |

**Or** use Vercel nameservers (`ns1.vercel-dns.com`, `ns2.vercel-dns.com`) and manage records in Vercel → Domains → beonely.in.

If nameservers still point at parking DNS (`dns-parking.com`), the site will not reach Vercel until you update them. As of setup, `beonely.in` may already hit Vercel over HTTP while `www` still resolves elsewhere until DNS is fixed.

**Check:** `vercel domains inspect beonely.in` — intended nameservers are `ns1.vercel-dns.com` / `ns2.vercel-dns.com`.

## Vercel project

1. [Vercel](https://vercel.com) → project **beonely** → **Settings** → **Domains**.
2. Add **`beonely.in`** and **`www.beonely.in`**; wait until both show **Valid**.
3. Set **`beonely.in`** as primary, or configure **`www.beonely.in`** → **Redirect to `beonely.in`** (308/301).

The repo also defines an edge redirect in [`vercel.json`](../vercel.json) for `www.beonely.in` → `https://beonely.in` (belt-and-suspenders when both hostnames hit the deployment).

### Canonical-host redirect (covers the `*.vercel.app` alias)

[`middleware.ts`](../middleware.ts) performs a production-only 308 redirect from any non-canonical host (notably the `*.vercel.app` deployment alias) to the host in `VITE_PUBLIC_SITE_URL` (default `beonely.in`). This guarantees sign-in, sign-out, and every other navigation stay on `https://beonely.in` even if a user lands on the raw deployment URL.

- Gated on `VERCEL_ENV === 'production'`, so preview deployments keep loading on their own `*.vercel.app` URLs.
- Requires `VITE_PUBLIC_SITE_URL` to be set in the Production environment (it both renders canonical links and derives the redirect target).

## Environment variables (Production)

| Variable | Value |
|----------|--------|
| `VITE_PUBLIC_SITE_URL` | `https://beonely.in` |

Redeploy after changing. Used for canonical links, OG URLs, share HTML, and emails.

## Supabase Auth

**Authentication** → **URL configuration**:

- **Site URL:** `https://beonely.in`
- **Redirect URLs:** `https://beonely.in/**`, `http://localhost:5173/**`

## Verify

```bash
curl -sI https://www.beonely.in/jobs | head -5
# Expect: HTTP/2 308 or 301, location: https://beonely.in/jobs

curl -sI https://beonely.in/ | head -5
# Expect: HTTP/2 200

curl -sI https://<your-prod-deployment>.vercel.app/ | head -5
# Expect: HTTP/2 308, location: https://beonely.in/
```
