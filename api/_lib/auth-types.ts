import type { AuthUser } from '@supabase/supabase-js'

/** Supabase auth user (Vercel resolves CJS types that export AuthUser, not User). */
export type { AuthUser }

/** Minimal auth client surface used by API bearer validation. */
export type AuthGetUserClient = {
  getUser: (
    jwt?: string
  ) => Promise<{
    data: { user: AuthUser | null }
    error: { message?: string } | null
  }>
}
