# Beonely demo personas and URLs

Use this when **QA-testing** or **walking stakeholders** through candidate, recruiter, and admin flows. Beonely uses **one** Supabase email/password system; your **role** is determined by database rows after you sign in.

## How roles are assigned

| After login you land on | Database condition |
|-------------------------|--------------------|
| `/candidate` | No row in `recruiters` for your `auth.users.id` |
| `/recruiter` | Row in `recruiters` with `role = 'recruiter'` |
| `/admin` | Row in `recruiters` with `role = 'admin'` |

The **`intent` query on sign-in URLs does not grant a role**—it only changes **headings and help text**. Recruiters and admins must be provisioned in Supabase (see below).

## Bookmarkable sign-in entry points

| Persona | Sign in URL | Sign up URL (optional) |
|---------|-------------|-------------------------|
| Candidate (job seeker) | `/apply/sign-in` | `/apply/sign-up` |
| Recruiter (hiring) | `/hire/sign-in` | `/hire/sign-up` |
| Admin (staff) | `/staff/sign-in` | (no staff sign-up — admin is assigned manually) |

Each sign-in shortcut **redirects** to `/sign-in?intent=…` (or `/sign-up?intent=…`) with the right copy.

## Suggested flows to explore

### 1. Candidate — profile

1. Create a Supabase Auth user **without** inserting a `recruiters` row (or use an existing candidate-only account).
2. Open **`/apply/sign-in`**, sign in.
3. You should land on **`/candidate`**.
4. Visit **`/candidate/profile`** (and resume/saved/applications as applicable).

### 2. Recruiter — post and pay

1. Create (or use) an Auth user that has a **`recruiters`** row with `role = 'recruiter'` and your `user_id` set.
2. Open **`/hire/sign-in`**, sign in.
3. You should land on **`/recruiter`**.
4. Create a draft job and use **Pay with Razorpay** (requires `vercel dev` or deployed `/api` and Razorpay env — see [vercel-environment.md](vercel-environment.md)).

### 3. Admin — moderate

1. In Supabase SQL or Table Editor, ensure your user has **`recruiters.role = 'admin'`** for their `user_id`. Do **not** expose self-service admin signup in production.
2. Open **`/staff/sign-in`**, sign in.
3. You should land on **`/admin`** and can open **`/admin/jobs`**, **`/users`**, etc.

## One-line SQL example (replace UUIDs)

After you have `auth.users.id` for a user:

```sql
insert into public.recruiters (user_id, company_name, email, role)
values ('<user-uuid>', 'Demo Co', 'recruiter@example.com', 'recruiter');
```

For admin, use `role = 'admin'` instead (and a real company name / email as required by your schema).

## Public site UX

On the marketing header, unauthenticated users see **Candidate sign in**, **Hiring sign in**, and **Post a job**. The last opens a modal aimed at recruiters; full-page hiring copy is on **`/hire/sign-in`**.

## Related docs

- [user-stories.md](user-stories.md) — product acceptance.
- [vercel-environment.md](vercel-environment.md) — env vars for APIs and payments.
