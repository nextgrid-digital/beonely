# Clarifications: 001-beonely-mvp

Structured resolution of ambiguities before locking the technical plan (Spec Kit `/speckit.clarify` equivalent).

| ID | Topic | Resolution | Spec / code impact |
|----|--------|------------|----------------------|
| C1 | Admin access denied behavior | **Redirect** non-admins to `/candidate` or `/recruiter` via `requireAdminBeforeLoad` instead of showing `/403` for those routes. | Update mental model from older `docs/user-stories.md` (which mentioned `/403` for some admin stories) to match [`src/lib/auth/route-guards.ts`](../../src/lib/auth/route-guards.ts). |
| C2 | Candidate “home” URL | **`/candidate`** is the candidate hub; `/dashboard` redirects by persona. | [`getPostAuthPath`](../../src/lib/auth/post-auth-path.ts), [`src/routes/_authenticated/dashboard/index.tsx`](../../src/routes/_authenticated/dashboard/index.tsx). |
| C3 | Publishable job definition | Public list uses **approved + paid + not expired** (and related fields) as implemented in job fetchers and `isListedPublicJob` on job detail. | Align acceptance language with [`src/lib/jobs/fetch-published-jobs.ts`](../../src/lib/jobs/fetch-published-jobs.ts) and job detail. |
| C4 | User stories vs `profiles.role` | Runtime role for gating is derived from **`recruiters`** row in [`AuthProvider`](../../src/context/auth-provider.tsx); there is no separate `profiles.role` for admin in the current client model. | Admin = `recruiters.role = admin`. |
| C5 | Payment for “boost” on live jobs | **Featured** plans can be purchased for **already live** listings per `api/create-order` / `api/verify-payment` boost branch. | Documented in plan; not in original user-stories only. |

**Open (backlog, not blocking baseline spec)**

- O1: Bulk admin actions on users (invite/delete) — out of scope v1 per user stories.
- O2: In-app apply pipeline beyond “record application” — TBD.
