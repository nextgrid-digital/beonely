import { redirect } from '@tanstack/react-router'
import { isAllowlistedAdminEmail } from '@/lib/auth/admin-access'
import { isRecruiterRegistrationMetadata } from '@/lib/auth/registration-intent'
import {
  getSupabaseBrowserClient,
  getSupabaseConfigured,
} from '@/lib/supabase/client'

export type SessionPersona = 'candidate' | 'recruiter' | 'admin'

type RecruiterPersonaRow = {
  role: 'recruiter' | 'admin'
  disabled: boolean
}

/** Resolves signed-in user to app persona using `recruiters` row (matches AuthProvider). */
export async function fetchSessionPersona(): Promise<SessionPersona | null> {
  try {
    if (!getSupabaseConfigured()) return null
    const sb = getSupabaseBrowserClient()
    const {
      data: { session },
    } = await sb.auth.getSession()
    if (!session?.user?.id) return null
    const { data: rec } = await sb
      .from('recruiters')
      .select('role, disabled')
      .eq('user_id', session.user.id)
      .maybeSingle()
    if (!rec) {
      if (isRecruiterRegistrationMetadata(session.user)) return 'recruiter'
      return 'candidate'
    }
    const row = rec as RecruiterPersonaRow
    if (row.disabled) return 'recruiter'
    if (row.role === 'admin') return 'admin'
    return 'recruiter'
  } catch {
    return null
  }
}

async function requireSessionOrRedirect(opts: {
  loginTo: string
  loginRedirectPath: string
}) {
  const sb = getSupabaseBrowserClient()
  try {
    const {
      data: { session },
    } = await sb.auth.getSession()
    if (session) return session
  } catch {
    // Continue to sign-in redirect below.
  }
  throw redirect({
    to: opts.loginTo,
    search: { redirect: opts.loginRedirectPath },
  })
}

/** Use in `beforeLoad` for routes that require staff allowlist + `recruiters.role = admin`. */
export async function requireAdminBeforeLoad(opts: {
  /** Path passed to staff sign-in as `redirect` when unauthenticated. */
  loginRedirectPath: string
}) {
  if (!getSupabaseConfigured()) {
    throw redirect({ to: '/' })
  }
  const session = await requireSessionOrRedirect({
    loginTo: '/staff/sign-in',
    loginRedirectPath: opts.loginRedirectPath,
  })
  const email = session.user.email ?? ''
  if (!isAllowlistedAdminEmail(email)) {
    throw redirect({
      to: '/staff/sign-in',
      search: { redirect: opts.loginRedirectPath, denied: 'allowlist' },
    })
  }
  const persona = await fetchSessionPersona()
  if (!persona) {
    throw redirect({
      to: '/staff/sign-in',
      search: { redirect: opts.loginRedirectPath },
    })
  }
  if (persona === 'admin') return
  throw redirect({
    to: '/staff/sign-in',
    search: { redirect: opts.loginRedirectPath, denied: 'role' },
  })
}

/** Recruiter portal: must have a recruiters row (recruiter or admin). */
export async function requireRecruiterAccountBeforeLoad(opts: {
  loginRedirectPath: string
}) {
  if (!getSupabaseConfigured()) {
    throw redirect({ to: '/' })
  }
  await requireSessionOrRedirect({
    loginTo: '/sign-in',
    loginRedirectPath: opts.loginRedirectPath,
  })
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

/** Candidate portal: recruiters and admins must not load candidate-only routes. */
export async function requireCandidateAccountBeforeLoad(opts: {
  loginRedirectPath: string
}) {
  if (!getSupabaseConfigured()) {
    throw redirect({ to: '/' })
  }
  await requireSessionOrRedirect({
    loginTo: '/sign-in',
    loginRedirectPath: opts.loginRedirectPath,
  })
  const persona = await fetchSessionPersona()
  if (!persona) {
    throw redirect({
      to: '/sign-in',
      search: { redirect: opts.loginRedirectPath },
    })
  }
  if (persona === 'candidate') return
  if (persona === 'admin') {
    const email = (await getSupabaseBrowserClient().auth.getSession()).data
      .session?.user?.email
    if (email && isAllowlistedAdminEmail(email)) return
    throw redirect({ to: '/admin' })
  }
  throw redirect({ to: '/recruiter' })
}
