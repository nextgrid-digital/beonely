# Research: 001-beonely-mvp (brownfield)

**Date**: 2026-05-13

## Summary

Beonely is a **brownfield** Vite SPA with Supabase Auth/DB and Vercel serverless payment APIs. No greenfield framework choice was required; this document records stack facts for future spec/plan reviews.

## Stack (verified in repo)

| Area | Choice | Location |
|------|--------|----------|
| Build | Vite 8 | `vite.config.ts`, `package.json` |
| UI | React 19, shadcn/ui, Tailwind | `src/components/` |
| Routing | TanStack Router (file-based) | `src/routes/`, `src/routeTree.gen.ts` |
| Data | Supabase JS client | `src/lib/supabase/client.ts`, `src/lib/supabase/database.types.ts` |
| API | Vercel functions | `api/*.ts` |
| Payments | Razorpay + server verify | `api/create-order.ts`, `api/verify-payment.ts` |

## Decisions

- **SDD workflow**: Spec Kit installed; constitution in `.specify/memory/constitution.md`.
- **RLS** is authoritative for candidate data; service role only on server.

## Out of scope for this research pass

- Competitive analysis of other job boards.
- Performance benchmarks (add when needed for scale milestones).
