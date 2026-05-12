import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Helmet } from 'react-helmet-async'
import { ExternalLink } from 'lucide-react'
import { getSupabaseBrowserClient, getSupabaseConfigured } from '@/lib/supabase/client'
import type { JobRow } from '@/lib/supabase/database.types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export const Route = createFileRoute('/jobs/$slug')({
  component: JobDetailPage,
})

function siteUrl () {
  return (
    import.meta.env.VITE_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    (typeof window !== 'undefined' ? window.location.origin : '')
  )
}

function JobDetailPage () {
  const { slug } = Route.useParams()

  const jobQuery = useQuery({
    queryKey: ['job', slug],
    queryFn: () => fetchJobBySlug(slug),
  })

  const job = jobQuery.data

  if (jobQuery.isLoading) {
    return (
      <main
        id='main-content'
        className='mx-auto w-full max-w-5xl px-4 py-16'
      >
        <div className='mx-auto max-w-3xl space-y-4' aria-busy='true' aria-label='Loading job'>
          <Skeleton className='h-4 w-28' />
          <Skeleton className='h-10 w-full max-w-xl' />
          <Skeleton className='h-5 w-48' />
          <Skeleton className='h-40 w-full' />
        </div>
      </main>
    )
  }

  if (jobQuery.isError || !job) {
    return (
      <main
        id='main-content'
        className='mx-auto w-full max-w-5xl px-4 py-16'
      >
        <div className='mx-auto max-w-3xl'>
          <h1 className='text-xl font-semibold'>Job not found</h1>
          <Button asChild className='mt-4' variant='outline'>
            <Link to='/jobs'>Back to jobs</Link>
          </Button>
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
        <meta property='og:description' content={`${job.company_name} — ${job.location}`} />
        <meta property='og:url' content={canonical} />
        <meta property='og:type' content='website' />
      </Helmet>
      <script type='application/ld+json'>{JSON.stringify(jsonLd)}</script>

      <main
        id='main-content'
        className='mx-auto w-full max-w-5xl px-4 py-16'
      >
        <div className='mx-auto max-w-3xl space-y-8'>
          <div className='text-sm text-muted-foreground'>
            <Link to='/jobs' className='hover:text-foreground'>
              All jobs
            </Link>
            <span className='mx-2'>/</span>
            <span>{job.company_name}</span>
          </div>

          <div className='flex flex-wrap items-start justify-between gap-4'>
            <div className='min-w-0 flex-1'>
              <div className='flex flex-wrap items-center gap-2'>
                <h1 className='text-3xl font-semibold tracking-tight'>{job.job_title}</h1>
                {job.featured && <Badge>Featured</Badge>}
              </div>
              <p className='mt-2 text-lg text-muted-foreground'>{job.company_name}</p>
              <div className='mt-3 flex flex-wrap gap-2'>
                {job.location && <Badge variant='outline'>{job.location}</Badge>}
                {job.employment_type && (
                  <Badge variant='outline'>{job.employment_type}</Badge>
                )}
                {job.work_mode && <Badge variant='outline'>{job.work_mode}</Badge>}
              </div>
            </div>
            <div className='flex shrink-0 flex-col gap-2 sm:flex-row sm:sticky sm:top-20 sm:z-10'>
              <Button asChild size='lg'>
                <a href={job.apply_url} target='_blank' rel='noreferrer'>
                  Apply externally
                  <ExternalLink className='ms-2 size-4' />
                </a>
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>About this role</CardTitle>
            </CardHeader>
            <CardContent className='max-w-none whitespace-pre-wrap text-sm leading-relaxed'>
              {job.job_description}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  )
}

function isListedPublicJob (job: JobRow): boolean {
  if (job.approval_status !== 'approved' || job.payment_status !== 'paid') {
    return false
  }
  if (job.listing_expires_at && new Date(job.listing_expires_at) <= new Date()) {
    return false
  }
  return true
}

async function fetchJobBySlug (slug: string): Promise<JobRow | null> {
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

function buildJobPostingJsonLd (job: JobRow, url: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.job_title,
    description: job.job_description,
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
    directApply: false,
    identifier: {
      '@type': 'PropertyValue',
      name: 'Beonely',
      value: job.id,
    },
    url,
  }
}
