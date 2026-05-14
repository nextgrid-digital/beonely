# Rotating Supabase API keys

If your **anon**, **service role**, **publishable**, or **secret** keys were exposed (committed to git, pasted in chat, shared in screenshots), treat them as compromised.

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Settings** → **API**.
2. Under **Project API keys**, use **Reset** or create new keys per Supabase’s current UI (JWT anon / service role, or newer `sb_publishable_` / `sb_secret_` pairs if your project uses them).
3. Update your local [`.env`](../.env) (never committed) with the new values:
   - `VITE_SUPABASE_ANON_KEY` — anon (public) key only for the browser.
   - `SUPABASE_SERVICE_ROLE_KEY` — service role only on the server; never prefix with `VITE_`.
4. Update the same variables on **Vercel** (or your host) for Production and Preview.
5. Restart `pnpm dev` and redeploy so new secrets apply.

This app’s browser client expects `VITE_SUPABASE_URL` plus the **JWT-style anon key** unless you migrate to newer publishable keys with an SDK change.
