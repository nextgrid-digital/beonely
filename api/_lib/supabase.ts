import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

export function getServiceSupabase () {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function getUserFromBearer (jwt: string | undefined) {
  if (!jwt) return { user: null as null, error: 'no_token' as const }
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const anon = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anon) {
    return { user: null as null, error: 'server_config' as const }
  }
  const sb = createClient<Database>(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const {
    data: { user },
    error,
  } = await sb.auth.getUser(jwt)
  if (error || !user) return { user: null as null, error: error?.message ?? 'invalid' }
  return { user, error: null as null }
}
