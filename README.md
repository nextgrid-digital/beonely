# Beonely

ServiceNow-focused job board and recruiter admin. Built on the shadcn-admin Vite + TanStack Router stack.

- **User stories:** [docs/user-stories.md](docs/user-stories.md)
- **Demo personas (candidate / recruiter / admin URLs and flows):** [docs/demo-personas.md](docs/demo-personas.md)
- **Environment:** Copy [`.env.example`](.env.example) to `.env`. Required: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Add `SUPABASE_SERVICE_ROLE_KEY` for local `/api` via `vercel dev`. Set `VITE_PUBLIC_SITE_URL` to your deployed origin for correct client-side URLs. Serverless secrets stay off `VITE_*` — see [docs/vercel-environment.md](docs/vercel-environment.md).
- **Key hygiene:** If keys were exposed, rotate them in Supabase — [docs/supabase-key-rotation.md](docs/supabase-key-rotation.md).
- **Development:** `pnpm install` then `pnpm dev`. For local `/api` routes, run `vercel dev` (Vite proxies `/api` in `vite.config.ts`).
- **Quality:** `pnpm lint`, `pnpm test`, `pnpm build` (aligned with CI).

### What you need to run Beonely (non-developer checklist)

1. **A Supabase project** with this app’s database rules applied (migrations in [`supabase/migrations/`](supabase/migrations/)), including the public Storage bucket **`avatars`** for candidate profile photos ([`20260515120000_candidate_avatars_storage.sql`](supabase/migrations/20260515120000_candidate_avatars_storage.sql)). You do not need to “code” that—your developer or CI applies migrations once per environment. Your `VITE_SUPABASE_URL` must point at that same project.
2. **Two keys in `.env` for the browser app:** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the Supabase dashboard (safe for the frontend; they are not secret admin keys).
3. **Optional — payments and server APIs:** Recruiters paying to publish use Razorpay. For **local** checkout testing you need [Vercel CLI](https://vercel.com/docs/cli) `vercel dev`, plus **`SUPABASE_SERVICE_ROLE_KEY`** and Razorpay test credentials configured per [docs/vercel-environment.md](docs/vercel-environment.md). Never put Razorpay secrets or the service role key in variables that start with `VITE_`.
4. **Public URLs:** Set `VITE_PUBLIC_SITE_URL` to your real site address when deployed so links and redirects stay correct.

More detail: [specs/001-beonely-mvp/quickstart.md](specs/001-beonely-mvp/quickstart.md).

### Spec-driven development

This repo uses [GitHub Spec Kit](https://github.com/github/spec-kit): principles live in [`.specify/memory/constitution.md`](.specify/memory/constitution.md); feature specs and plans live under [`specs/`](specs/) (for example [`specs/001-beonely-mvp/`](specs/001-beonely-mvp/)). Use the Cursor skills under [`.cursor/skills/`](.cursor/skills/) (`speckit-constitution`, `speckit-specify`, `speckit-clarify`, `speckit-plan`, `speckit-tasks`, `speckit-implement`) to run the **constitution → specify → clarify → plan → tasks → implement** flow.

### License

Beonely application code in this repository is **proprietary** (not open source). See [`LICENSE`](LICENSE). Dependencies and upstream UI boilerplate remain under their own licenses (for example MIT for many npm packages).

This GitHub repository is **private**; do not redistribute code or assets outside your organization without written permission.
