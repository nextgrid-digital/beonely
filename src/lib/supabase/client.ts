import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function browserConfig(): { url: string; anonKey: string } {
  return {
    url: (
      (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? ''
    ).trim(),
    anonKey: (
      (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? ''
    ).trim(),
  }
}

export function getSupabaseConfigured(): boolean {
  const { url, anonKey } = browserConfig()
  return Boolean(url && anonKey)
}

/** Public project origin used to resolve app-owned Storage object paths. */
export function getSupabaseUrl(): string {
  return browserConfig().url
}

export function createSupabaseBrowserClient(): SupabaseClient {
  const { url, anonKey } = browserConfig()
  if (!url || !anonKey) {
    throw new Error(
      'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Add them to .env for Beonely.'
    )
  }
  return createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
}

let browserClient: SupabaseClient | null = null

/** Singleton for SPA; throws if env not set (call getSupabaseConfigured first in dev). */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (!browserClient) {
    browserClient = createSupabaseBrowserClient()
  }
  return browserClient
}
