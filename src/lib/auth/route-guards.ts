import { redirect } from '@tanstack/react-router'
import {
  getSupabaseBrowserClient,
  getSupabaseConfigured,
} from '@/lib/supabase/client'

export type SessionPersona = 'candidate' | 'recruiter' | 'admin'

/** Resolves signed-in user to app persona using `recruiters` row (matches AuthProvider). */
export async function fetchSessionPersona(): Promise<SessionPersona | null> {
  if (!getSupabaseConfigured()) return null
  const sb = getSupabaseBrowserClient()
  const {
    data: { session },
  } = await sb.auth.getSession()
  if (!session?.user?.id) return null
  const { data: rec } = await sb
    .from('recruiters')
    .select('role')
    .eq('user_id', session.user.id)
    .maybeSingle()
  if (!rec) return 'candidate'
  if (rec.role === 'admin') return 'admin'
  return 'recruiter'
}

function nonAdminHome(
  persona: SessionPersona
): '/candidate/profile' | '/recruiter' {
  return persona === 'recruiter' ? '/recruiter' : '/candidate/profile'
}

/** Use in `beforeLoad` for routes that require `recruiters.role = admin`. */
export async function requireAdminBeforeLoad(opts: {
  /** Path passed to `/sign-in` as `redirect` when unauthenticated. */
  loginRedirectPath: string
}) {
  if (!getSupabaseConfigured()) {
    throw redirect({ to: '/' })
  }
  const sb = getSupabaseBrowserClient()
  const {
    data: { session },
  } = await sb.auth.getSession()
  if (!session) {
    throw redirect({
      to: '/sign-in',
      search: { redirect: opts.loginRedirectPath },
    })
  }
  const persona = await fetchSessionPersona()
  if (!persona) {
    throw redirect({
      to: '/sign-in',
      search: { redirect: opts.loginRedirectPath },
    })
  }
  if (persona === 'admin') return
  throw redirect({ to: nonAdminHome(persona) })
}

/** Recruiter portal: must have a recruiters row (recruiter or admin). */
export async function requireRecruiterAccountBeforeLoad(opts: {
  loginRedirectPath: string
}) {
  if (!getSupabaseConfigured()) {
    throw redirect({ to: '/' })
  }
  const sb = getSupabaseBrowserClient()
  const {
    data: { session },
  } = await sb.auth.getSession()
  if (!session) {
    throw redirect({
      to: '/sign-in',
      search: { redirect: opts.loginRedirectPath },
    })
  }
  const persona = await fetchSessionPersona()
  if (!persona) {
    throw redirect({
      to: '/sign-in',
      search: { redirect: opts.loginRedirectPath },
    })
  }
  if (persona === 'recruiter' || persona === 'admin') return
  throw redirect({ to: '/candidate/profile' })
}
