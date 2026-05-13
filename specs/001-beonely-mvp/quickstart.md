# Quickstart: Beonely local dev

**Date**: 2026-05-13

1. **Install**: `pnpm install`
2. **Env**: copy [`.env.example`](../../.env.example) → `.env` and set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` for full API testing. See [docs/vercel-environment.md](../../docs/vercel-environment.md).
3. **Dev server**: `pnpm dev` → http://localhost:5173/
4. **Serverless API locally**: `vercel dev` (Vite proxies `/api` per `vite.config.ts` when configured).
5. **Quality**: `pnpm lint` · `pnpm test` · `pnpm run build`

Spec Kit skill entry points live under [`.cursor/skills/`](../../.cursor/skills/) (e.g. `speckit-constitution`, `speckit-specify`).
