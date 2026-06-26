import type { JobRow } from '@/lib/supabase/database.types'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/auth-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Link } from '@tanstack/react-router'
import { ApplyWithCandidateAuth } from '@/features/jobs/apply-with-candidate-auth'
import { CompanyLogoAvatar } from '@/features/jobs/company-logo-avatar'
import { JobCompanyCard } from '@/features/jobs/job-company-card'
import { JobDescriptionRichTextRead } from '@/features/jobs/job-description-rich-text-field'
import { JobListingMetaBadges } from '@/features/jobs/job-listing-meta-badges'
import { SimilarJobsSection } from '@/features/jobs/similar-jobs-section'

export function JobDetailApplySection({ job }: { job: JobRow }) {
  const { profile, loading, user } = useAuth()
  const recruiterOrAdmin =
    profile?.role === 'recruiter' || profile?.role === 'admin'

  if (user && loading) {
    return (
      <div className='flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row'>
        <Skeleton className='h-11 w-full sm:h-10 sm:w-36' aria-hidden />
      </div>
    )
  }

  if (recruiterOrAdmin) {
    const ownsListing =
      job.source_kind === 'recruiter_posted' &&
      Boolean(profile?.recruiter_row_id) &&
      profile.recruiter_row_id === job.recruiter_id

    return (
      <div className='flex w-full shrink-0 flex-col gap-2 text-left sm:w-auto sm:max-w-[14rem] sm:items-end sm:text-right'>
        {ownsListing ? (
          <Button
            asChild
            variant='outline'
            size='default'
            className='min-h-11 w-full sm:min-h-9 sm:w-auto'
          >
            <Link
              to='/recruiter/jobs/$jobId/applicants'
              params={{ jobId: job.id }}
            >
              View applicants
            </Link>
          </Button>
        ) : null}
        {!ownsListing ? (
          <p className='text-xs text-muted-foreground'>
            Recruiter accounts cannot apply from this page.
          </p>
        ) : null}
      </div>
    )
  }

  return <ApplyWithCandidateAuth job={job} />
}

function JobMetaBadges({
  job,
  includeLocation = true,
}: {
  job: JobRow
  includeLocation?: boolean
}) {
  return (
    <JobListingMetaBadges
      location={includeLocation ? job.location : undefined}
      employmentType={job.employment_type}
      workMode={job.work_mode}
      experienceLevel={job.experience_level}
      jobType={job.job_type}
      salaryRange={job.salary_range}
      modules={job.modules}
      certifications={job.certifications}
      skills={job.skills}
    />
  )
}

function JobAboutCard({ job }: { job: JobRow }) {
  return (
    <Card className='border-0 shadow-none'>
      <CardHeader>
        <CardTitle>About this role</CardTitle>
      </CardHeader>
      <CardContent className='min-w-0'>
        <JobDescriptionRichTextRead value={job.job_description} />
      </CardContent>
    </Card>
  )
}

/**
 * Read-only public job detail body. The `page` variant (full `/jobs/$slug`
 * route) renders the title/logo header inline; the `peek` variant assumes the
 * title, company, and logo are already shown in the side-peek header and lays
 * the body out in two columns (details left, company card + apply right).
 */
export function JobDetailView({
  job,
  className,
  showApplySection = true,
  showSimilarJobs = true,
  variant = 'page',
}: {
  job: JobRow
  className?: string
  /** Hide the candidate apply / recruiter call-to-action column (e.g. admin moderation). */
  showApplySection?: boolean
  /** Hide the "Similar jobs" section (e.g. inside management peeks). */
  showSimilarJobs?: boolean
  /** `peek` drops the inline title/logo header and uses a two-column layout. */
  variant?: 'page' | 'peek'
}) {
  if (variant === 'peek') {
    return (
      <div className={cn('@container space-y-6', className)}>
        <div className='grid gap-6 @2xl:grid-cols-[1fr_18rem]'>
          <div className='min-w-0 space-y-6'>
            <div className='min-w-0'>
              <div className='flex flex-wrap items-center gap-2'>
                <h1 className='text-xl font-semibold tracking-tight'>
                  {job.job_title}
                </h1>
                {job.featured && <Badge>Featured</Badge>}
              </div>
              <p className='mt-1 text-sm text-muted-foreground'>
                {job.company_name}
                {job.location ? ` · ${job.location}` : ''}
              </p>
            </div>
            <JobAboutCard job={job} />
          </div>
          <div className='space-y-4 bg-card p-4 text-card-foreground @2xl:sticky @2xl:top-0 @2xl:self-start'>
            <JobMetaBadges job={job} includeLocation={false} />
            <div className='border-t border-border pt-4'>
              <JobCompanyCard job={job} />
            </div>
          </div>
        </div>

        {showSimilarJobs ? <SimilarJobsSection job={job} /> : null}
      </div>
    )
  }

  return (
    <div className={cn('space-y-6 sm:space-y-8', className)}>
      <div className='flex flex-col items-start gap-4 sm:flex-row sm:flex-wrap sm:justify-between'>
        <div className='flex min-w-0 flex-1 gap-4'>
          <CompanyLogoAvatar
            companyName={job.company_name}
            logoUrl={job.company_logo}
            className='size-14'
          />
          <div className='min-w-0 flex-1'>
            <div className='flex flex-wrap items-center gap-2'>
              <h1 className='text-2xl font-semibold tracking-tight sm:text-3xl'>
                {job.job_title}
              </h1>
              {job.featured && <Badge>Featured</Badge>}
            </div>
            <p className='mt-2 text-base text-muted-foreground sm:text-lg'>
              {job.company_name}
            </p>
            <div className='mt-3'>
              <JobMetaBadges job={job} />
            </div>
          </div>
        </div>
        {showApplySection ? (
          <div className='flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row'>
            <JobDetailApplySection job={job} />
          </div>
        ) : null}
      </div>

      <JobAboutCard job={job} />

      {showSimilarJobs ? <SimilarJobsSection job={job} /> : null}
    </div>
  )
}
