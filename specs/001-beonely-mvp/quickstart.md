# Quickstart: Beonely local dev

**Date**: 2026-05-13

## Everyday development (UI + Supabase data)

1. **Install**: `pnpm install`
2. **Minimal `.env`**: copy [`.env.example`](../../.env.example) → `.env`. At minimum set **`VITE_SUPABASE_URL`** and **`VITE_SUPABASE_ANON_KEY`** from your Supabase project settings so sign-in and lists work.
3. **Run the site**: `pnpm dev` → http://localhost:5173/

That is enough to browse jobs, sign in, and use candidate/recruiter flows **if** your Supabase project has the expected tables and policies (apply migrations under [`supabase/migrations/`](../../supabase/migrations/) to match production).

## Payments and `/api` routes (Razorpay)

Paid listings call server routes under [`api/`](../../api/). Those routes run on **Vercel** in production; locally you simulate that with:

1. Install [Vercel CLI](https://vercel.com/docs/cli), then from the repo root run **`vercel dev`** (instead of only `pnpm dev` when you need checkout).
2. Add **`SUPABASE_SERVICE_ROLE_KEY`** (server-only; never `VITE_*`) so APIs can update jobs/payments with elevated access—see [docs/vercel-environment.md](../../docs/vercel-environment.md).
3. Add **Razorpay test keys** in the same env file / Vercel project as documented there so “Pay to publish” can complete in test mode.

## Quality checks before you merge

`pnpm lint` · `pnpm test` · `pnpm run build`

---

Spec Kit skill entry points live under [`.cursor/skills/`](../../.cursor/skills/) (e.g. `speckit-constitution`, `speckit-specify`).
