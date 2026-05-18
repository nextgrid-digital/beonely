import { z } from 'zod'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { isAllowlistedAdminEmail } from '@/lib/auth/admin-access'
import { fetchSessionPersona } from '@/lib/auth/route-guards'
import {
  getSupabaseBrowserClient,
  getSupabaseConfigured,
} from '@/lib/supabase/client'
import { StaffSignIn } from '@/features/auth/staff-sign-in'

const staffSignInSearchSchema = z.object({
  redirect: z.string().optional(),
  denied: z.enum(['allowlist', 'role']).optional(),
})

export const Route = createFileRoute('/staff/sign-in')({
  validateSearch: staffSignInSearchSchema,
  beforeLoad: async ({ search }) => {
    if (!getSupabaseConfigured()) return
    const sb = getSupabaseBrowserClient()
    const {
      data: { session },
    } = await sb.auth.getSession()
    if (!session?.user?.email) return
    const email = session.user.email
    if (!isAllowlistedAdminEmail(email)) return
    const persona = await fetchSessionPersona()
    if (persona !== 'admin') return
    const dest =
      search.redirect && search.redirect.startsWith('/')
        ? search.redirect
        : '/admin'
    throw redirect({ to: dest })
  },
  component: StaffSignIn,
})
