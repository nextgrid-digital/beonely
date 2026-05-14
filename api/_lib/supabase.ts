import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import type { Database } from '../../src/lib/supabase/database.types'

export type ServiceSupabaseInitResult =
  | { ok: true; client: SupabaseClient<Database> }
  | { ok: false; reason: 'missing_url' | 'missing_service_role_key' }

/** Prefer this in API routes so missing env returns JSON instead of an uncaught throw. */
export function tryGetServiceSupabase (): ServiceSupabaseInitResult {
  const url = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL)?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url) return { ok: false, reason: 'missing_url' }
  if (!key) return { ok: false, reason: 'missing_service_role_key' }
  return {
    ok: true,
    client: createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  }
}

export async function getUserFromBearer (jwt: string | undefined) {
  if (!jwt) return { user: null as null, error: 'no_token' as const }
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const anon = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anon) {
    return { user: null as null, error: 'server_config' as const }
  }
  // No Database generic: keeps `auth.getUser(jwt)` visible to strict server typecheckers (e.g. Vercel).
  const sb = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const {
    data: { user },
    error,
  } = await sb.auth.getUser(jwt)
  if (error || !user) return { user: null as null, error: error?.message ?? 'invalid' }
  return { user: user as User, error: null as null }
}
