# Tasks: Beonely MVP baseline (brownfield)

**Input**: [`spec.md`](./spec.md), [`plan.md`](./plan.md), [`clarifications.md`](./clarifications.md)

**Prerequisites**: Repository initialized with Spec Kit (`.specify/`). Baseline documents committed or staged.

**Organization**: Verification tasks reflect **already-built** behavior; backlog tasks extend MVP.

## Phase 1: Spec Kit & documentation

- [x] T001 Install `specify-cli` from `github/spec-kit` (pinned release, e.g. v0.8.9).
- [x] T002 Run `specify init --here --force --ai cursor-agent --ignore-agent-tools` (or `--integration cursor-agent` when stable).
- [x] T003 Author [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md) for Beonely.
- [x] T004 Create `specs/001-beonely-mvp/` with `spec.md`, `clarifications.md`, `plan.md`, `research.md`, `data-model.md`, `quickstart.md`, `contracts/README.md`, `tasks.md`.

## Phase 2: Verification (maps to user stories)

**Visitor / public**

- [ ] T010 [US1] Manually verify `/` and `/jobs` show only published listings when Supabase is configured.
- [ ] T011 [US1] Manually verify `/jobs/$slug` for a live job shows apply CTA and metadata.

**Auth / personas**

- [ ] T020 [US2] Sign in as candidate → lands on `/candidate`; recruiter → `/recruiter`; admin → `/admin` per policy.
- [ ] T021 [US2] Hit `/dashboard` → redirects by persona (no legacy analytics shell).

**Recruiter**

- [ ] T030 [US3] Create/edit draft job on `/recruiter`; confirm RLS scopes jobs to own `recruiter_id`.
- [ ] T031 [US3] Exercise Razorpay checkout in test mode with `vercel dev` + env secrets.

**Admin**

- [ ] T040 [US4] As non-admin, confirm `/admin/jobs` and `/users` redirect (no admin UI).
- [ ] T041 [US4] As admin, confirm moderation and users pages load.

**Candidate**

- [ ] T050 [US5] Candidate navigates `/candidate`, `/candidate/profile`, saved applications flows per migration presence.

**Automation**

- [ ] T060 Run `pnpm test` and `pnpm run build` on clean branch before merge.

## Phase 3: Backlog (optional next specs)

- [ ] T070 Align [`docs/user-stories.md`](../../docs/user-stories.md) admin redirect wording with clarifications (403 → redirect).
- [ ] T071 Add Playwright (or extend Vitest) smoke for auth redirects if product requires CI gates.
- [ ] T072 OpenAPI export for `api/create-order` / `api/verify-payment` if external consumers appear.

---

**Checkpoint**: Phase 2 complete when manual verification passes and T060 is green.
