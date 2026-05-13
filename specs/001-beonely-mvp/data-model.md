# Data model: Beonely (reference)

**Date**: 2026-05-13

This is a **conceptual** view aligned to Supabase migrations and [`src/lib/supabase/database.types.ts`](../../src/lib/supabase/database.types.ts). Authoritative schema is in SQL migrations.

## Core tables (public)

| Table | Purpose |
|-------|---------|
| `recruiters` | Hiring org + **role** (`recruiter` \| `admin`); tied to `auth.users`. |
| `jobs` | Listings: slug, copy, `approval_status`, `payment_status`, `listing_expires_at`, `featured`, etc. |
| `payments` | Razorpay orders linked to `recruiter_id` + `job_id`. |
| `job_seeker_profiles` | Candidate profile + resume metadata / storage path. |
| `saved_jobs` | `(user_id, job_id)` for bookmarks (auth user id). |
| `job_applications` | Candidate application records per job. |
| `applications` | Recruiter-centric pipeline rows (separate from candidate `job_applications`). |

## Auth

- **Supabase Auth** provides `auth.users`.
- **Profile role** in app layer: from `recruiters` if present, else **candidate**.

## Storage

- Private **`resumes`** bucket (per-user path prefix) when enabled by migration; see candidate resume flow.
