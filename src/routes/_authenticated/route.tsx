import { createFileRoute, redirect } from '@tanstack/react-router'
import {
  getSupabaseBrowserClient,
  getSupabaseConfigured,
} from '@/lib/supabase/client'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ location }) => {
    if (!getSupabaseConfigured()) {
      throw redirect({
        to: '/',
        search: { setup: 'supabase' },
      })
    }
    const supabase = getSupabaseBrowserClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      throw redirect({
        to: '/sign-in',
        search: { redirect: location.pathname },
      })
    }
  },
  component: AuthenticatedLayout,
})
