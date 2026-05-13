# Beonely — user stories

Short, testable stories for the MVP. Acceptance criteria reflect current or intended UI behavior.

---

## Visitor (unauthenticated)

### US-V-01 — Browse published jobs

**As a** visitor  
**I want** to see a list of published, non-expired jobs  
**So that** I can explore ServiceNow hiring opportunities.

**Acceptance**

- `/jobs` loads without signing in when Supabase env is configured.
- Only jobs with `status = published` and valid `expires_at` (if set) appear.
- Search and facet filters update the URL and results.

### US-V-02 — Job detail

**As a** visitor  
**I want** to open a job detail page by slug  
**So that** I can read the full description and apply.

**Acceptance**

- `/jobs/$slug` resolves for published jobs.
- Page includes title, company, and apply link or URL.

### US-V-03 — Sign up / sign in

**As a** visitor  
**I want** to create an account or sign in  
**So that** I can post jobs or access the dashboard.

**Acceptance**

- `/sign-up` and `/sign-in` render when Supabase is configured.
- Successful auth establishes a session and redirects per app rules.

---

## Recruiter (authenticated)

### US-R-01 — Recruiter profile

**As a** recruiter  
**I want** to create a company profile once  
**So that** I can attach jobs to my organization.

**Acceptance**

- `/recruiter` prompts for company name when no `recruiters` row exists for my user.
- After creation, the recruiter dashboard loads.

### US-R-02 — Manage jobs

**As a** recruiter  
**I want** to create, edit, and list my jobs  
**So that** I can publish listings after payment and review.

**Acceptance**

- Job list is scoped to my `recruiter_id`.
- Create/update flows persist to Supabase subject to RLS.

### US-R-03 — Pay to publish

**As a** recruiter  
**I want** to pay via Razorpay for a plan  
**So that** my job can move toward published state.

**Acceptance**

- Checkout opens with merchant name “Beonely” (and optional branding per product).
- Successful verification updates job/payment state server-side.

---

## Admin (authenticated, `recruiters.role = admin`)

Admin access is determined by a **`recruiters`** row with **`role = admin`** (same source as the rest of the app), not a separate `profiles.role` field.

### US-A-01 — Moderate jobs

**As an** admin  
**I want** to see all jobs and change status (approve, reject, feature)  
**So that** the board stays high quality.

**Acceptance**

- `/admin/jobs` is only reachable with an admin `recruiters` row; others are **redirected** to their home (`/candidate` or `/recruiter`), not shown a forbidden page.
- Table lists jobs across statuses allowed by RLS.

### US-A-02 — List platform users (profiles)

**As an** admin  
**I want** to see all `profiles` rows  
**So that** I can audit who has access (candidate / recruiter / admin).

**Acceptance**

- `/users` is only reachable with an admin `recruiters` row; others are **redirected** to their home (`/candidate` or `/recruiter`).
- Table is **read-only** in v1 (no invite/delete/role edit) because RLS only allows self `UPDATE` on profiles unless extended by migration.
- Columns include at least: email, user id, role, created time.
- Filters support email text and role multi-select where implemented.

### US-A-03 — Non-admin cannot open admin surfaces

**As a** non-admin user  
**I want** admin navigation hidden and deep links blocked  
**So that** I cannot manage other users’ jobs or profiles.

**Acceptance**

- Sidebar does not show Admin jobs or Users for non-admins.
- Direct navigation to `/admin/jobs` or `/users` **redirects** non-admins to `/candidate` or `/recruiter` (see route guards), consistent with hiding admin nav for non-admins.

---

## Edge / non-goals (v1)

- **Bulk user actions** (invite, activate, delete): not supported against live Supabase in v1.
- **Admin role change UI**: requires new RLS policies and migrations; out of scope until specified.
