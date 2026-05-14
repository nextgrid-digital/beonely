import { useEffect } from 'react'
import { createFileRoute, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/auth-provider'
import { isJobSeekerProfileComplete } from '@/lib/candidate/profile-completion'
import { syncJobSeekerFromUserMetadata } from '@/lib/candidate/sync-job-seeker-from-metadata'
import { getSupabaseBrowserClient, getSupabaseConfigured } from '@/lib/supabase/client'

export const Route = createFileRoute('/_authenticated/candidate')({
  component: CandidateSectionLayout,
})

function CandidateSectionLayout () {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  // eslint-disable-next-line @tanstack/query/exhaustive-deps -- user id in queryKey is sufficient
  const completionQuery = useQuery({
    queryKey: ['job-seeker-profile-completion', user?.id],
    enabled: Boolean(
      user &&
        getSupabaseConfigured() &&
        profile?.role === 'candidate'
    ),
    queryFn: async () => {
      const sb = getSupabaseBrowserClient()
      const u = user!
      await syncJobSeekerFromUserMetadata(sb, u)
      const { data, error } = await sb
        .from('job_seeker_profiles')
        .select('linkedin_url, phone')
        .eq('user_id', u.id)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })

  useEffect(() => {
    if (!user || profile?.role !== 'candidate') return
    if (pathname.startsWith('/candidate/profile')) return
    if (completionQuery.isLoading || completionQuery.isFetching) return
    if (!completionQuery.isSuccess) return
    if (isJobSeekerProfileComplete(completionQuery.data)) return
    void navigate({
      to: '/candidate/profile',
      search: { returnTo: pathname },
      replace: true,
    })
  }, [
    user,
    profile?.role,
    pathname,
    completionQuery.isLoading,
    completionQuery.isFetching,
    completionQuery.isSuccess,
    completionQuery.data,
    navigate,
  ])

  return <Outlet />
}
