# Implementation Plan: Beonely MVP baseline (brownfield)

**Branch**: `001-beonely-mvp` | **Date**: 2026-05-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-beonely-mvp/spec.md`

## Summary

Beonely is a ServiceNow-focused job marketplace with **three personas** (candidate, recruiter, admin), **Supabase** for auth/data, **Razorpay** for listing payments, and **Vercel serverless** for payment orchestration. This plan documents the **existing** architecture so future features extend consistently; it does not re-implement the MVP from scratch.

## Technical Context

**Language/Version**: TypeScript (strict), React 19, Node for Vercel handlers

**Primary Dependencies**: Vite, TanStack Router, `@supabase/supabase-js`, shadcn/ui (Radix), Razorpay SDK (server)

**Storage**: Supabase Postgres + Storage (`resumes` bucket when migration applied)

**Testing**: Vitest (`pnpm test`), browser tests via Vitest browser mode

**Target Platform**: Modern evergreen browsers; Vercel for API routes

**Project Type**: SPA + serverless API (`src/` + `api/`)

**Performance Goals**: Reasonable LCP on job lists; no separate SLA defined—follow Core Web Vitals best practices

**Constraints**: No service role key in client bundle; RLS enforced for candidate tables

**Scale/Scope**: MVP job board + admin moderation + recruiter checkout

## Constitution Check

- **Role isolation**: Enforced via [`src/lib/auth/route-guards.ts`](../../src/lib/auth/route-guards.ts) and role-filtered sidebar [`src/components/layout/data/sidebar-data.ts`](../../src/components/layout/data/sidebar-data.ts).
- **Secrets**: Client [`src/lib/supabase/client.ts`](../../src/lib/supabase/client.ts); server [`api/_lib/supabase.ts`](../../api/_lib/supabase.ts).
- **Payments**: [`api/create-order.ts`](../../api/create-order.ts), [`api/verify-payment.ts`](../../api/verify-payment.ts) aligned with [`src/lib/payments/plans.ts`](../../src/lib/payments/plans.ts).
- **Quality**: `pnpm lint`, `pnpm test`, `pnpm build`.

## Project Structure

### Documentation (this feature)

```text
specs/001-beonely-mvp/
├── spec.md
├── clarifications.md
├── plan.md              # This file
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/README.md
└── tasks.md
```

### Source code (repository — authoritative)

```text
src/
├── routes/                 # TanStack Router routes (_authenticated, jobs, auth)
├── features/               # Feature modules (jobs, recruiter, auth, users)
├── components/             # Shared UI including layout/sidebar
├── lib/
│   ├── auth/               # post-auth path, route guards
│   ├── supabase/           # client + database.types.ts
│   ├── payments/           # plan constants, Razorpay helpers
│   └── jobs/               # published job fetching, slugs
├── context/                # AuthProvider, theme, etc.
api/
├── create-order.ts
├── verify-payment.ts
└── _lib/                   # Supabase service, plan helpers, rate limit
supabase/migrations/        # SQL source of truth for schema
```

## Phases (brownfield)

| Phase | Focus |
|-------|--------|
| 0 | Env + Supabase project wired (see quickstart) |
| 1 | Public job discovery + job detail |
| 2 | Auth + persona routing |
| 3 | Recruiter CRUD + Razorpay |
| 4 | Admin moderation + users table |
| 5 | Candidate hub + saved/applications + resume (as migrated) |

Feature-specific PRs should cite `specs/001-beonely-mvp/spec.md` sections.
