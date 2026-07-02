import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const publicSupabaseUrl = 'https://qxqkfgiyuqoxthpnsmyo.supabase.co'
const publicSupabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4cWtmZ2l5dXFveHRocG5zbXlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTA3NTksImV4cCI6MjA5MzcyNjc1OX0.tqy5XgQLzks5VONW-wxNit78Xb5cAioQNTEN973sSU4'

const url =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ||
  publicSupabaseUrl
const anonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ||
  publicSupabaseAnonKey

export function getSupabaseConfigured(): boolean {
  return Boolean(url && anonKey)
}

export function createSupabaseBrowserClient(): SupabaseClient {
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
