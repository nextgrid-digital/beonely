import { useEffect, useRef } from 'react'
import { z } from 'zod'
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import type { Session } from '@supabase/supabase-js'
import { Loader2 } from 'lucide-react'
import { isAllowlistedAdminEmail } from '@/lib/auth/admin-access'
import { sanitizeRedirectPath } from '@/lib/auth/redirect-path'
import { fetchSessionPersona } from '@/lib/auth/route-guards'
import { signInIntentSchema } from '@/lib/auth/sign-in-intent'
import {
  signUpUserTypeFromMetadata,
  USER_TYPE_METADATA_KEY,
  LEGACY_REGISTRATION_INTENT_METADATA_KEY,
} from '@/lib/auth/user-account-type'
import {
  getSupabaseBrowserClient,
  getSupabaseConfigured,
} from '@/lib/supabase/client'
import { useAuth } from '@/context/auth-provider'
import { AuthLayout } from '@/features/auth/auth-layout'

const authCallbackSearchSchema = z.object({
  intent: signInIntentSchema.optional(),
  redirect: z.string().optional(),
})

export const Route = createFileRoute('/auth/callback')({
  validateSearch: authCallbackSearchSchema,
  component: AuthCallback,
})

const SESSION_WAIT_TIMEOUT_MS = 8000

/** Resolves the session after an OAuth redirect, waiting briefly for URL detection. */
async function resolveSessionAfterOAuth(): Promise<Session | null> {
  const sb = getSupabaseBrowserClient()
  const { data } = await sb.auth.getSession()
  if (data.session) return data.session

  return new Promise<Session | null>((resolve) => {
    let settled = false
    const finish = (session: Session | null) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      subscription.unsubscribe()
      resolve(session)
    }
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_event, next) => {
      if (next) finish(next)
    })
    const timer = setTimeout(() => finish(null), SESSION_WAIT_TIMEOUT_MS)
  })
}

function AuthCallback() {
  const { intent, redirect } = useSearch({ from: '/auth/callback' })
  const navigate = useNavigate()
  const { refreshProfile } = useAuth()
  const ranRef = useRef(false)

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true

    async function finalize() {
      if (!getSupabaseConfigured()) {
        void navigate({ to: '/sign-in', replace: true })
        return
      }

      const sb = getSupabaseBrowserClient()
      const session = await resolveSessionAfterOAuth()
      if (!session?.user) {
        void navigate({ to: '/sign-in', replace: true })
        return
      }

      const email = session.user.email ?? ''
      const persona = await fetchSessionPersona()

      // Recruiter entry: stamp persona metadata unless already recruiter/admin.
      if (
        intent === 'recruiter' &&
        persona !== 'recruiter' &&
        persona !== 'admin' &&
        signUpUserTypeFromMetadata(session.user) !== 'recruiter'
      ) {
        await sb.auth.updateUser({
          data: {
            [USER_TYPE_METADATA_KEY]: 'recruiter',
            [LEGACY_REGISTRATION_INTENT_METADATA_KEY]: 'recruiter',
          },
        })
      }

      // Staff entry: must be allowlisted and have admin persona.
      if (intent === 'admin') {
        if (!email || !isAllowlistedAdminEmail(email) || persona !== 'admin') {
          await sb.auth.signOut()
          void navigate({
            to: '/staff/sign-in',
            search: { denied: 'allowlist' },
            replace: true,
          })
          return
        }
      }

      const profile = await refreshProfile()

      const safeRedirect = sanitizeRedirectPath(redirect)
      if (safeRedirect) {
        void navigate({ to: safeRedirect, replace: true })
        return
      }

      const role = profile?.role
      const dest =
        role === 'admin'
          ? '/admin'
          : role === 'recruiter'
            ? '/recruiter'
            : '/candidate/profile'
      void navigate({ to: dest, replace: true })
    }

    void finalize()
  }, [intent, redirect, navigate, refreshProfile])

  return (
    <AuthLayout>
      <div className='flex flex-col items-center justify-center gap-3 py-8 text-center'>
        <Loader2 className='size-6 animate-spin text-muted-foreground' />
        <p className='text-sm text-muted-foreground'>Signing you in…</p>
      </div>
    </AuthLayout>
  )
}
