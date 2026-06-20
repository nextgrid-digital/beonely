import type { SignInIntent } from '@/lib/auth/sign-in-intent'
import {
  getSupabaseBrowserClient,
  getSupabaseConfigured,
} from '@/lib/supabase/client'

export type GoogleSignInOptions = {
  /** Persona entry point so the callback can stamp metadata / verify access. */
  intent?: SignInIntent
  /** In-app path to return to after the callback finalizes (must start with '/'). */
  redirect?: string
}

/**
 * Starts the Google OAuth flow. This performs a full-page redirect to Google and
 * then back to `/auth/callback`, where the session is finalized and the user is
 * routed based on `intent` / `redirect`.
 */
export async function signInWithGoogle(
  options: GoogleSignInOptions = {}
): Promise<{ error: string | null }> {
  if (!getSupabaseConfigured()) {
    return { error: 'Supabase is not configured.' }
  }
  if (typeof window === 'undefined') {
    return { error: 'Google sign-in is only available in the browser.' }
  }

  const callbackUrl = new URL('/auth/callback', window.location.origin)
  if (options.intent) {
    callbackUrl.searchParams.set('intent', options.intent)
  }
  if (options.redirect && options.redirect.startsWith('/')) {
    callbackUrl.searchParams.set('redirect', options.redirect)
  }

  const sb = getSupabaseBrowserClient()
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callbackUrl.toString(),
      queryParams: { prompt: 'select_account' },
    },
  })

  return { error: error?.message ?? null }
}
