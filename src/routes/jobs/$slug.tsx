import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { fetchJobBySlug } from '@/lib/jobs/fetch-job-by-slug'
import { jobOgImageUrl } from '@/lib/jobs/job-share-url'
import { plainTextFromJobDescription } from '@/lib/jobs/sanitize-job-description-html'
import type { JobRow } from '@/lib/supabase/database.types'
import { useAuth } from '@/context/auth-provider'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RecordApplicationButton } from '@/features/jobs/candidate-job-actions'
import { JobDetailView } from '@/features/jobs/job-detail-view'
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
            <h1 className='text-lg font-semibold sm:text-xl'>Job not found</h1>
            <Button
              asChild
              className='mt-4 min-h-11 w-full sm:min-h-9 sm:w-auto'
              variant='outline'
            >
              <Link to='/'>Back to jobs</Link>
            </Button>
          </div>
        </div>
      </main>
    )
  }

  const canonical = `${siteUrl()}/jobs/${job.job_slug}`
  const ogImage = jobOgImageUrl(job.job_slug)
  const ogDescription =
    plainTextFromJobDescription(job.job_description).slice(0, 160) ||
    `${job.company_name}${job.location ? ` — ${job.location}` : ''}`
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
        <meta property='og:description' content={ogDescription} />
        <meta property='og:url' content={canonical} />
        <meta property='og:type' content='website' />
        <meta property='og:image' content={ogImage} />
        <meta property='og:image:width' content='1200' />
        <meta property='og:image:height' content='630' />
        <meta name='twitter:card' content='summary_large_image' />
        <meta name='twitter:title' content={`${job.job_title} · Beonely`} />
        <meta name='twitter:description' content={ogDescription} />
        <meta name='twitter:image' content={ogImage} />
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
          <div className='mx-auto max-w-3xl pt-4 pb-12 sm:pt-6 sm:pb-16'>
            <JobDetailView job={job} />
          </div>
        </div>
      </main>
    </>
  )
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
