import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  getSupabaseBrowserClient,
  getSupabaseConfigured,
} from '@/lib/supabase/client'
import type { JobRow, Tables } from '@/lib/supabase/database.types'
import { useAuth } from '@/context/auth-provider'
import { Badge } from '@/components/ui/badge'
import { PUBLIC_SITE_MAIN_COLUMN } from '@/features/jobs/public-site-layout'

export const Route = createFileRoute('/_authenticated/candidate/applications')({
  component: CandidateApplicationsPage,
})

type JobAppRow = {
  applied_at: string
  job_id: string
  notes: string | null
  jobs: JobRow | null
}

type BeonelyAppRow = Tables<'applications'> & {
  jobs: JobRow | null
}

function CandidateApplicationsPage() {
  const { user } = useAuth()

  const jobAppsQuery = useQuery({
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
      return (data ?? []) as unknown as JobAppRow[]
    },
  })

  const beonelyAppsQuery = useQuery({
    queryKey: ['beonely-applications', user?.id],
    enabled: Boolean(user && getSupabaseConfigured()),
    queryFn: async () => {
      const sb = getSupabaseBrowserClient()
      const { data, error } = await sb
        .from('applications')
        .select('*, jobs(*)')
        .eq('candidate_user_id', user!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as BeonelyAppRow[]
    },
  })

  if (!getSupabaseConfigured()) {
    return (
      <p className='px-4 py-6 text-sm text-muted-foreground'>
        Connect Supabase to load applications.
      </p>
    )
  }

  return (
    <div className={`${PUBLIC_SITE_MAIN_COLUMN} space-y-10 py-12`}>
      <section className='space-y-4'>
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>
            Beonely applications
          </h1>
          <p className='text-sm text-muted-foreground'>
            Roles where you applied with your Beonely profile to a recruiter
            listing.
          </p>
        </div>
        {beonelyAppsQuery.isLoading && (
          <p className='text-sm text-muted-foreground'>Loading…</p>
        )}
        {beonelyAppsQuery.isError && (
          <p className='text-sm text-destructive'>
            Could not load Beonely applications. Apply the latest Supabase
            migration if this table is missing.
          </p>
        )}
        <ul className='space-y-3'>
          {(beonelyAppsQuery.data ?? []).map((row) => {
            const job = Array.isArray(row.jobs) ? row.jobs[0] : row.jobs
            if (!job) return null
            return (
              <li key={row.id} className='rounded-lg border p-3'>
                <div className='flex flex-wrap items-start justify-between gap-2'>
                  <div>
                    <p className='font-medium'>{job.job_title}</p>
                    <p className='text-sm text-muted-foreground'>
                      {job.company_name}
                    </p>
                    <div className='mt-2 flex flex-wrap items-center gap-2'>
                      <Badge variant='outline' className='text-xs capitalize'>
                        {row.status}
                      </Badge>
                      <p className='text-xs text-muted-foreground'>
                        Submitted{' '}
                        {new Date(row.created_at).toLocaleDateString()}
                      </p>
                    </div>
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
        {!beonelyAppsQuery.isLoading &&
          (beonelyAppsQuery.data ?? []).length === 0 && (
            <p className='text-sm text-muted-foreground'>
              No Beonely applications yet. Apply from a recruiter-posted job
              using your Beonely profile.
            </p>
          )}
      </section>

      <section className='space-y-4'>
        <div>
          <h2 className='text-lg font-semibold tracking-tight'>
            Tracked applications
          </h2>
          <p className='text-sm text-muted-foreground'>
            Roles you marked as applied yourself (e.g. after using an external
            apply link).
          </p>
        </div>
        {jobAppsQuery.isLoading && (
          <p className='text-sm text-muted-foreground'>Loading…</p>
        )}
        {jobAppsQuery.isError && (
          <p className='text-sm text-destructive'>
            Could not load tracked applications.
          </p>
        )}
        <ul className='space-y-3'>
          {(jobAppsQuery.data ?? []).map((row) => {
            const job = Array.isArray(row.jobs) ? row.jobs[0] : row.jobs
            if (!job) return null
            return (
              <li key={row.job_id} className='rounded-lg border p-3'>
                <div className='flex flex-wrap items-start justify-between gap-2'>
                  <div>
                    <p className='font-medium'>{job.job_title}</p>
                    <p className='text-sm text-muted-foreground'>
                      {job.company_name}
                    </p>
                    <p className='mt-1 text-xs text-muted-foreground'>
                      Applied {new Date(row.applied_at).toLocaleDateString()}
                    </p>
                    {row.notes && (
                      <p className='mt-2 text-sm text-muted-foreground'>
                        {row.notes}
                      </p>
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
        {!jobAppsQuery.isLoading && (jobAppsQuery.data ?? []).length === 0 && (
          <p className='text-sm text-muted-foreground'>
            No tracked applications yet. On a scraped or external listing, use
            &quot;Mark as applied&quot; on the job page.
          </p>
        )}
      </section>
    </div>
  )
}
