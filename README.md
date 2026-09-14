# Beonely

ServiceNow-focused job board and recruiter admin. Built on the shadcn-admin Vite + TanStack Router stack.

- **User stories:** [docs/user-stories.md](docs/user-stories.md)
- **Demo personas (candidate / recruiter / admin URLs and flows):** [docs/demo-personas.md](docs/demo-personas.md)
- **Environment:** Copy [`.env.example`](.env.example) to `.env`. Required: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Add `SUPABASE_SERVICE_ROLE_KEY` for local `/api` via `vercel dev`. Set `VITE_PUBLIC_SITE_URL` to your deployed origin for correct client-side URLs. Serverless secrets stay off `VITE_*` — see [docs/vercel-environment.md](docs/vercel-environment.md).
- **Key hygiene:** If keys were exposed, rotate them in Supabase — [docs/supabase-key-rotation.md](docs/supabase-key-rotation.md).
- **Development:** `pnpm install` then `pnpm dev`. For local `/api` routes (Razorpay, etc.), either run **`pnpm dev:local`** (starts Vite + `vercel dev` on **127.0.0.1:3000** in one terminal), or run **`pnpm dev:api`** in a **second** terminal alongside `pnpm dev`. Vite proxies `/api` to `127.0.0.1:3000` — without the API process you will see **502** or long **timeouts** on `/api/create-order`.
- **Before `pnpm dev:local`:** Stop any older dev servers so **port 3000** (API) and **5173** (Vite) are free. If Vite prints “Port 5173 is in use”, open the **Local** URL it shows (e.g. `http://localhost:5174`). If `vercel dev` prints `yarn: command not found`, the linked Vercel project is set to Yarn in the dashboard — set **Package Manager** / **Install Command** to **pnpm** (Project → Settings → General, or Build & Development), or ensure `installCommand` in [`vercel.json`](vercel.json) is saved and run `vercel dev` again.
- **Quality:** `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm typecheck:api`, and `pnpm knip` (aligned with CI).

### Preview environment safety

The browser bundle has no hard-coded Supabase project fallback. A Preview built
without Supabase client variables remains fail-closed and shows a persistent
configuration warning; a Production build without them fails. For end-to-end
Preview testing, scope `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and any
server credentials to a staging Supabase project. Do not copy production
service-role, payment, or email-delivery secrets into Preview.

### Vercel production checklist

If the deployed site shows **Supabase is not configured**, an empty jobs list, or auth works locally but not on Vercel:

1. In the Vercel project, ensure Supabase client env is available for **Production**: either **`VITE_SUPABASE_URL`** + **`VITE_SUPABASE_ANON_KEY`**, or the **Supabase+Vercel integration** defaults **`SUPABASE_URL`** + **`SUPABASE_ANON_KEY`** (the build maps those for the browser). Also set **`VITE_PUBLIC_SITE_URL`** to **`https://beonely.in`** (canonical apex; see [docs/custom-domain-beonely-in.md](docs/custom-domain-beonely-in.md)) under **Settings** → **Environment Variables** with **Production** enabled.
2. **Redeploy** so `pnpm build` runs again (`VITE_*` values are baked in at build time).
3. Confirm the Supabase project URL matches your local `.env` if you expect the same data.
4. **External testers:** If email links send people to a **Vercel login**, turn off **Deployment Protection** for the URL you share (or only share production). See [docs/vercel-environment.md](docs/vercel-environment.md#external-testers-and-vercel-deployment-protection).

Details: [docs/vercel-environment.md](docs/vercel-environment.md).

### What you need to run Beonely (non-developer checklist)

1. **A Supabase project** with this app’s database rules applied, including public Storage buckets **`avatars`** ([`20260515120000_candidate_avatars_storage.sql`](supabase/migrations/20260515120000_candidate_avatars_storage.sql)) and **`job-logos`** ([`20260517120000_job_company_logos_storage.sql`](supabase/migrations/20260517120000_job_company_logos_storage.sql)). Existing environments must reconcile their recorded migration history before applying the July forward chain. The legacy May files are not a supported clean-database bootstrap; create a separately reviewed squashed baseline for a new project. Your `VITE_SUPABASE_URL` must point at the intended environment.
2. **Two keys in `.env` for the browser app:** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the Supabase dashboard (safe for the frontend; they are not secret admin keys).
3. **Optional locally, required for production payments and server APIs:** Recruiters paying to publish use Razorpay. For **local** checkout testing you need [Vercel CLI](https://vercel.com/docs/cli) `vercel dev`, plus **`SUPABASE_SERVICE_ROLE_KEY`** and Razorpay test credentials configured per [docs/vercel-environment.md](docs/vercel-environment.md). Production also requires signed Razorpay/Resend webhook secrets, `CRON_SECRET`, and the paired Turnstile site/secret keys used by payment dialogs. Never put Razorpay secrets, the Turnstile secret, or the service role key in variables that start with `VITE_`.
4. **Public URLs:** Set `VITE_PUBLIC_SITE_URL` to your real site address when deployed so links and redirects stay correct.

More detail: [specs/001-beonely-mvp/quickstart.md](specs/001-beonely-mvp/quickstart.md).

### Spec-driven development

This repo uses [GitHub Spec Kit](https://github.com/github/spec-kit): principles live in [`.specify/memory/constitution.md`](.specify/memory/constitution.md); feature specs and plans live under [`specs/`](specs/) (for example [`specs/001-beonely-mvp/`](specs/001-beonely-mvp/)). Use the Cursor skills under [`.cursor/skills/`](.cursor/skills/) (`speckit-constitution`, `speckit-specify`, `speckit-clarify`, `speckit-plan`, `speckit-tasks`, `speckit-implement`) to run the **constitution → specify → clarify → plan → tasks → implement** flow.

### License

Beonely application code in this repository is **proprietary** (not open source). See [`LICENSE`](LICENSE). Dependencies and upstream UI boilerplate remain under their own licenses (for example MIT for many npm packages).

Repository visibility is managed separately in GitHub and does not change the proprietary license. Do not redistribute code or assets outside your organization without written permission.
