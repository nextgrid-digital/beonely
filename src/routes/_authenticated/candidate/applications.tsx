import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useAuth } from '@/context/auth-provider'
import { PUBLIC_SITE_MAIN_COLUMN } from '@/features/jobs/public-site-layout'
import { getSupabaseBrowserClient, getSupabaseConfigured } from '@/lib/supabase/client'
import type { JobRow } from '@/lib/supabase/database.types'

export const Route = createFileRoute('/_authenticated/candidate/applications')({
  component: CandidateApplicationsPage,
})

type AppRow = {
  applied_at: string
  job_id: string
  notes: string | null
  jobs: JobRow | null
}

function CandidateApplicationsPage () {
  const { user } = useAuth()

  const appsQuery = useQuery({
    queryKey: ['job-applications', user?.id],
    enabled: Boolean(user && getSupabaseConfigured()),
    queryFn: async () => {
      const sb = getSupabaseBrowserClient()
      const { data, error } = await sb
        .from('job_applications')
        .select('applied_at, job_id, notes, jobs(*)')
        .eq('user_id', user!.id)
        .order('applied_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as AppRow[]
    },
  })

  if (!getSupabaseConfigured()) {
    return (
      <p className='px-4 py-6 text-sm text-muted-foreground'>Connect Supabase to load applications.</p>
    )
  }

  return (
    <div className={`${PUBLIC_SITE_MAIN_COLUMN} space-y-6 py-12`}>
      <div>
        <h1 className='text-2xl font-semibold tracking-tight'>Applications</h1>
        <p className='text-sm text-muted-foreground'>
          Roles you marked as applied (external apply links are still used on the job page).
        </p>
      </div>
      {appsQuery.isLoading && <p className='text-sm text-muted-foreground'>Loading…</p>}
      {appsQuery.isError && (
        <p className='text-sm text-destructive'>
          Could not load applications. Apply the latest Supabase migration if this table is missing.
        </p>
      )}
      <ul className='space-y-3'>
        {(appsQuery.data ?? []).map((row) => {
          const job = Array.isArray(row.jobs) ? row.jobs[0] : row.jobs
          if (!job) return null
          return (
            <li key={row.job_id} className='rounded-lg border p-3'>
              <div className='flex flex-wrap items-start justify-between gap-2'>
                <div>
                  <p className='font-medium'>{job.job_title}</p>
                  <p className='text-sm text-muted-foreground'>{job.company_name}</p>
                  <p className='mt-1 text-xs text-muted-foreground'>
                    Applied {new Date(row.applied_at).toLocaleDateString()}
                  </p>
                  {row.notes && (
                    <p className='mt-2 text-sm text-muted-foreground'>{row.notes}</p>
                  )}
                </div>
                <Link
                  to='/jobs/$slug'
                  params={{ slug: job.job_slug }}
                  className='text-sm font-medium text-primary underline-offset-4 hover:underline'
                >
                  View job
                </Link>
              </div>
            </li>
          )
        })}
      </ul>
      {!appsQuery.isLoading && (appsQuery.data ?? []).length === 0 && (
        <p className='text-sm text-muted-foreground'>
          No applications recorded yet. On a job page, use &quot;Mark as applied&quot;.
        </p>
      )}
    </div>
  )
}
