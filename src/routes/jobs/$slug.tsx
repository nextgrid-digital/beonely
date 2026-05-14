import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import {
  getSupabaseBrowserClient,
  getSupabaseConfigured,
} from '@/lib/supabase/client'
import type { JobRow } from '@/lib/supabase/database.types'
import { useAuth } from '@/context/auth-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ApplyWithCandidateAuth } from '@/features/jobs/apply-with-candidate-auth'
import { JobDescriptionRichTextRead } from '@/features/jobs/job-description-rich-text-field'
import { RecordApplicationButton } from '@/features/jobs/candidate-job-actions'
import { plainTextFromJobDescription } from '@/lib/jobs/sanitize-job-description-html'
import {
  PUBLIC_SITE_BREADCRUMB_LINK,
  PUBLIC_SITE_BREADCRUMB_LIST,
  PUBLIC_SITE_MAIN_COLUMN,
  PublicSiteStickySubheader,
} from '@/features/jobs/public-site-layout'

export const Route = createFileRoute('/jobs/$slug')({
  component: JobDetailPage,
})

function siteUrl() {
  return (
    import.meta.env.VITE_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    (typeof window !== 'undefined' ? window.location.origin : '')
  )
}

function JobDetailBreadcrumb({ currentLabel }: { currentLabel: string }) {
  return (
    <ol className={PUBLIC_SITE_BREADCRUMB_LIST}>
      <li className='inline-flex items-center gap-2'>
        <Link to='/' className={PUBLIC_SITE_BREADCRUMB_LINK}>
          Home
        </Link>
        <ChevronRight className='size-4 shrink-0 opacity-60' aria-hidden />
      </li>
      <li className='inline-flex items-center gap-2'>
        <Link to='/' className={PUBLIC_SITE_BREADCRUMB_LINK}>
          All jobs
        </Link>
        <ChevronRight className='size-4 shrink-0 opacity-60' aria-hidden />
      </li>
      <li className='min-w-0 font-medium text-stone-800' aria-current='page'>
        <span className='block truncate'>{currentLabel}</span>
      </li>
    </ol>
  )
}

function JobDetailPage() {
  const { slug } = Route.useParams()
  const { user } = useAuth()

  const jobQuery = useQuery({
    queryKey: ['job', slug],
    queryFn: () => fetchJobBySlug(slug),
  })

  const job = jobQuery.data

  if (jobQuery.isLoading) {
    return (
      <main
        id='main-content'
        className={`${PUBLIC_SITE_MAIN_COLUMN} flex min-h-svh flex-col pb-12`}
      >
        <div className='w-full pt-2'>
          <PublicSiteStickySubheader
            breadcrumb={<JobDetailBreadcrumb currentLabel='Loading…' />}
          />
          <div
            className='mx-auto max-w-3xl space-y-4 pt-6 pb-16'
            aria-busy='true'
            aria-label='Loading job'
          >
            <Skeleton className='h-4 w-28' />
            <Skeleton className='h-10 w-full max-w-xl' />
            <Skeleton className='h-5 w-48' />
            <Skeleton className='h-40 w-full' />
          </div>
        </div>
      </main>
    )
  }

  if (jobQuery.isError || !job) {
    return (
      <main
        id='main-content'
        className={`${PUBLIC_SITE_MAIN_COLUMN} flex min-h-svh flex-col pb-12`}
      >
        <div className='w-full pt-2'>
          <PublicSiteStickySubheader
            breadcrumb={<JobDetailBreadcrumb currentLabel='Job not found' />}
          />
          <div className='mx-auto max-w-3xl pt-6 pb-16'>
            <h1 className='text-xl font-semibold'>Job not found</h1>
            <Button asChild className='mt-4' variant='outline'>
              <Link to='/'>Back to jobs</Link>
            </Button>
          </div>
        </div>
      </main>
    )
  }

  const canonical = `${siteUrl()}/jobs/${job.job_slug}`
  const jsonLd = buildJobPostingJsonLd(job, canonical)

  return (
    <>
      <Helmet>
        <title>{`${job.job_title} · ${job.company_name} | Beonely`}</title>
        <meta
          name='description'
          content={`${job.job_title} at ${job.company_name}. ${job.location || 'ServiceNow role'}.`}
        />
        <link rel='canonical' href={canonical} />
        <meta property='og:title' content={`${job.job_title} · Beonely`} />
        <meta
          property='og:description'
          content={`${job.company_name} — ${job.location}`}
        />
        <meta property='og:url' content={canonical} />
        <meta property='og:type' content='website' />
      </Helmet>
      <script type='application/ld+json'>{JSON.stringify(jsonLd)}</script>

      <main
        id='main-content'
        className={`${PUBLIC_SITE_MAIN_COLUMN} flex min-h-svh flex-col pb-12`}
      >
        <div className='w-full pt-2'>
          <PublicSiteStickySubheader
            breadcrumb={<JobDetailBreadcrumb currentLabel={job.job_title} />}
            actions={
              user && job.source_kind !== 'recruiter_posted' ? (
                <RecordApplicationButton
                  jobId={job.id}
                  jobTitle={job.job_title}
                  size='sm'
                />
              ) : null
            }
          />
          <div className='mx-auto max-w-3xl space-y-8 pt-6 pb-16'>
            <div className='flex flex-wrap items-start justify-between gap-4'>
              <div className='min-w-0 flex-1'>
                <div className='flex flex-wrap items-center gap-2'>
                  <h1 className='text-3xl font-semibold tracking-tight'>
                    {job.job_title}
                  </h1>
                  {job.featured && <Badge>Featured</Badge>}
              {job.source_kind === 'recruiter_posted' && (
                <Badge variant='secondary' className='text-[10px] uppercase'>
                  On Beonely
                </Badge>
              )}
                </div>
                <p className='mt-2 text-lg text-muted-foreground'>
                  {job.company_name}
                </p>
                <div className='mt-3 flex flex-wrap gap-2'>
                  {job.location && (
                    <Badge variant='outline'>{job.location}</Badge>
                  )}
                  {job.employment_type && (
                    <Badge variant='outline'>{job.employment_type}</Badge>
                  )}
                  {job.work_mode && (
                    <Badge variant='outline'>{job.work_mode}</Badge>
                  )}
                </div>
              </div>
              <div className='flex shrink-0 flex-col gap-2 sm:sticky sm:top-[7.125rem] sm:z-10 sm:flex-row'>
                <ApplyWithCandidateAuth job={job} />
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>About this role</CardTitle>
              </CardHeader>
              <CardContent className='max-w-none'>
                <JobDescriptionRichTextRead value={job.job_description} />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  )
}

function isListedPublicJob(job: JobRow): boolean {
  if (job.approval_status !== 'approved' || job.payment_status !== 'paid') {
    return false
  }
  if (
    job.listing_expires_at &&
    new Date(job.listing_expires_at) <= new Date()
  ) {
    return false
  }
  return true
}

async function fetchJobBySlug(slug: string): Promise<JobRow | null> {
  if (!getSupabaseConfigured()) return null
  const sb = getSupabaseBrowserClient()
  const { data, error } = await sb
    .from('jobs')
    .select('*')
    .eq('job_slug', slug)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const job = data as JobRow
  if (!isListedPublicJob(job)) return null
  return job
}

function buildJobPostingJsonLd(job: JobRow, url: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.job_title,
    description: plainTextFromJobDescription(job.job_description),
    datePosted: job.created_at,
    validThrough: job.listing_expires_at ?? undefined,
    employmentType: job.employment_type,
    hiringOrganization: {
      '@type': 'Organization',
      name: job.company_name,
    },
    jobLocation: job.location
      ? {
          '@type': 'Place',
          address: {
            '@type': 'PostalAddress',
            addressLocality: job.location,
          },
        }
      : undefined,
    directApply: job.source_kind === 'recruiter_posted',
    identifier: {
      '@type': 'PropertyValue',
      name: 'Beonely',
      value: job.id,
    },
    url,
  }
}
