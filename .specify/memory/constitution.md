# Beonely Constitution

Spec-driven development principles for the Beonely ServiceNow job board (Vite + TanStack Router + Supabase + Vercel).

## Core Principles

### I. Role isolation (NON-NEGOTIABLE)

Three product surfaces—**candidate**, **recruiter**, **admin**—must remain strictly separated in navigation and routing. Admin-only routes (`/admin/*`, `/users`) require `recruiters.role = admin`. Recruiter routes require a `recruiters` row. Candidates must never see admin affordances in the UI; unauthorized deep links **redirect** to the appropriate home (`/candidate`, `/recruiter`), not expose privileged UI.

### II. Secrets and data access

**Never** expose `SUPABASE_SERVICE_ROLE_KEY`, Razorpay secrets, or other server keys via `VITE_*` or client bundles. Browser uses **anon** key only; serverless `api/*` uses service role where required. Respect **RLS** on all Supabase access from the client; privileged writes go through server routes when policy demands it.

### III. Payments integrity

Paid listings use **Razorpay** via [`api/create-order.ts`](api/create-order.ts) and [`api/verify-payment.ts`](api/verify-payment.ts). Amounts and plan enums must stay aligned with [`src/lib/payments/plans.ts`](src/lib/payments/plans.ts) and [`api/_lib/plan-helpers.ts`](api/_lib/plan-helpers.ts). Do not bypass payment state machines for production flows without an explicit spec amendment.

### IV. Quality gates

Before merging feature work: **`pnpm lint`**, **`pnpm test`**, **`pnpm build`** pass. Prefer targeted tests for auth, routing, and payment-critical paths. UI changes match existing shadcn/ui patterns and accessibility expectations.

### V. Scope discipline

Prefer minimal diffs that satisfy the spec. Avoid drive-by refactors and unrelated files. When extending schema, ship migrations under [`supabase/migrations/`](supabase/migrations/) and update [`src/lib/supabase/database.types.ts`](src/lib/supabase/database.types.ts) when applicable.

## Architecture constraints

- **Frontend**: SPA built with Vite; routing via TanStack Router (`src/routes/`, generated `routeTree.gen.ts`).
- **Backend**: Supabase (Auth, Postgres, Storage); Vercel serverless for payment and privileged operations.
- **Auth model**: [`AuthProvider`](src/context/auth-provider.tsx) derives `profile.role` from `recruiters`; no separate admin login—authorization is route + RLS + API checks.

## Development workflow

1. Feature work flows through **spec → clarify → plan → tasks → implement** (Spec Kit).
2. Feature specs live under `specs/<NNN-feature>/` on dedicated branches when possible.
3. Constitution overrides ad-hoc preferences in chat; amendments update this file with version bump.

## Governance

- All substantial features require an updated **spec.md** and **plan.md** alignment before `/speckit.implement`-style execution.
- Product acceptance criteria remain technology-agnostic in `spec.md`; stack choices belong in `plan.md`.

**Version**: 1.0.0 | **Ratified**: 2026-05-13 | **Last Amended**: 2026-05-13
