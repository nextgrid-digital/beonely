# Feature Specification: Beonely MVP (brownfield baseline)

**Feature Branch**: `001-beonely-mvp`

**Created**: 2026-05-13

**Status**: Baseline (documents existing + intended MVP scope)

**Input**: Brownfield baseline for Beonely ServiceNow job board MVP. Source: [`docs/user-stories.md`](../../docs/user-stories.md) and current implementation under `src/`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Browse and discover jobs (Visitor) (Priority: P1)

Visitors browse published, non-expired ServiceNow-focused listings with filters that sync to the URL.

**Why this priority**: Core value of the marketplace.

**Independent Test**: Load `/` and `/jobs`; results reflect published jobs only (approval + payment + not expired per product rules).

**Acceptance Scenarios**:

1. **Given** Supabase env is configured, **When** the visitor opens the home or jobs list, **Then** published jobs render with working filters.
2. **Given** a job slug for a live listing, **When** the visitor opens `/jobs/$slug`, **Then** title, company, description, and apply affordances render.

---

### User Story 2 — Authenticated sessions (Visitor → account) (Priority: P1)

Users sign up or sign in and land on the correct persona home (candidate vs recruiter vs admin).

**Why this priority**: Unlocks recruiter and candidate surfaces.

**Independent Test**: Sign-in produces a session and redirects per [`getPostAuthPath`](../../src/lib/auth/post-auth-path.ts) / route guards.

**Acceptance Scenarios**:

1. **Given** valid credentials, **When** the user signs in, **Then** session is established and navigation respects role.
2. **Given** a recruiter account (`recruiters` row), **When** the user completes auth, **Then** default landing aligns with recruiter policy (`/recruiter`).
3. **Given** an admin (`recruiters.role = admin`), **When** the user lands after auth, **Then** admin home policy applies (`/admin`).

---

### User Story 3 — Recruiter listings and payment (Priority: P2)

Recruiters maintain a company profile, create/edit draft jobs, pay via Razorpay, and see moderation outcomes.

**Why this priority**: Revenue path and supply side of the board.

**Independent Test**: Create draft → pay (test mode) → job reaches paid/pending moderation state per [`api/verify-payment.ts`](../../api/verify-payment.ts).

**Acceptance Scenarios**:

1. **Given** no recruiter row, **When** the user visits `/recruiter`, **Then** they can create a company profile.
2. **Given** a draft unpaid job, **When** checkout completes successfully, **Then** payment and job rows update server-side.

---

### User Story 4 — Admin moderation and user visibility (Priority: P2)

Admins moderate jobs and inspect platform users; non-admins cannot access admin surfaces.

**Why this priority**: Trust and safety for paid listings.

**Independent Test**: Non-admin navigates to `/admin/jobs` or `/users` → redirected away; admin sees moderation and users tables.

**Acceptance Scenarios**:

1. **Given** a non-admin session, **When** the user opens `/admin/jobs` or `/users`, **Then** route guards redirect (no admin UI).
2. **Given** an admin session, **When** the user opens moderation routes, **Then** jobs/users management UI is available.

---

### User Story 5 — Candidate job seeker hub (Priority: P3)

Candidates have a home area for profile, resume, saved jobs, and recorded applications (aligned with product roadmap).

**Why this priority**: Demand side retention; phased implementation.

**Independent Test**: Candidate session accesses `/candidate` and subroutes; saved/applications persist under RLS when tables exist.

**Acceptance Scenarios**:

1. **Given** a candidate session, **When** they open `/candidate`, **Then** hub/navigation works.
2. **Given** a signed-in candidate on a job detail page, **When** they save or record application, **Then** rows persist per migration and policies.

---

### Edge Cases

- Supabase env missing: app shows setup messaging and avoids authenticated data paths.
- Listing expired: job should not appear in public lists; recruiter/admin behavior per enums on `jobs`.
- Boost/featured upgrade on live jobs: allowed only for featured plans per API rules (see plan).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST show only listings that satisfy public job visibility rules (approved, paid, not expired as implemented).
- **FR-002**: System MUST enforce persona separation via route guards and role-derived navigation.
- **FR-003**: System MUST process recruiter payments through Razorpay order creation + verified webhook/signing path on the server.
- **FR-004**: Admins MUST moderate jobs (approve/reject/feature as implemented) without granting those capabilities to recruiters/candidates.
- **FR-005**: Authenticated candidates MUST be able to persist saved jobs and job applications where schema and RLS exist.

### Key Entities

- **Job**: Listing with slug, company, compensation text, approval and payment fields, featured flags.
- **Recruiter**: Organization row tied to `auth.users`; role includes `admin` for operators.
- **Profile / job seeker**: Candidate-facing profile and optional resume metadata.
- **Payment**: Razorpay order linkage stored for reconciliation.

## Clarifications resolved

See [`clarifications.md`](clarifications.md) for structured Q&A (including redirect vs 403 behavior).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new developer can run the app locally using [`docs/vercel-environment.md`](../../docs/vercel-environment.md) and `.env.example` within one session.
- **SC-002**: Critical flows (browse → job detail; recruiter draft → pay stub; admin sees queue) are executable without mock Supabase in production configuration.
- **SC-003**: `pnpm build` and `pnpm test` succeed on CI-aligned commands before merge.

## Assumptions

- Target users have modern evergreen browsers.
- ServiceNow hiring domain copy and pricing in INR are acceptable for v1.
- LinkedIn or external apply URLs remain valid for many listings.

## References

- [`docs/user-stories.md`](../../docs/user-stories.md)
- [`src/lib/auth/route-guards.ts`](../../src/lib/auth/route-guards.ts)
