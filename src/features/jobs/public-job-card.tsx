import { Link } from '@tanstack/react-router'
import type { JobRow } from '@/lib/supabase/database.types'
import { useAuth } from '@/context/auth-provider'
import { plainTextFromJobDescription } from '@/lib/jobs/sanitize-job-description-html'
import { cn } from '@/lib/utils'
import { CompanyLogoAvatar } from '@/features/jobs/company-logo-avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/** Single-line-ish plain text for card excerpt (HTML descriptions are flattened first). */
function excerptPlain(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

export function PublicJobCard({ job }: { job: JobRow }) {
  const { profile, user, loading } = useAuth()
  const descriptionExcerpt = excerptPlain(
    plainTextFromJobDescription(job.job_description ?? '')
  )

  const recruiterOrAdmin =
    profile?.role === 'recruiter' || profile?.role === 'admin'
  const ownsBeonelyListing =
    job.source_kind === 'recruiter_posted' &&
    profile?.recruiter_row_id === job.recruiter_id

  return (
    <Card
      className={cn(
        'rounded-none border-0 border-b border-border bg-card shadow-none',
        job.featured && 'border-primary/40 bg-primary/[0.03]'
      )}
    >
      <CardHeader className='flex flex-col gap-3 space-y-0 pb-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4'>
        <div className='flex min-w-0 flex-1 gap-3'>
          <CompanyLogoAvatar
            companyName={job.company_name}
            logoUrl={job.company_logo}
          />
          <div className='min-w-0 flex-1'>
            <div className='flex flex-wrap items-center gap-2'>
              <h2 className='text-base leading-tight font-medium sm:text-lg'>
                <Link
                  to='/jobs/$slug'
                  params={{ slug: job.job_slug }}
                  className='hover:underline'
                >
                  {job.job_title}
                </Link>
              </h2>
              {job.featured && (
                <Badge variant='default' className='text-[10px] uppercase'>
                  Featured
                </Badge>
              )}
              {job.source_kind === 'recruiter_posted' && (
                <Badge variant='secondary' className='text-[10px] uppercase'>
                  On Beonely
                </Badge>
              )}
              {job.source_kind === 'linkedin_import' && (
                <Badge variant='outline' className='text-[10px] uppercase'>
                  LinkedIn
                </Badge>
              )}
            </div>
            <p className='text-sm text-muted-foreground'>
              {job.company_name} · {job.location || 'Location TBD'}
            </p>
            {descriptionExcerpt ? (
              <p className='mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground'>
                {descriptionExcerpt}
              </p>
            ) : null}
          </div>
        </div>
        <div className='w-full sm:w-auto sm:shrink-0'>
          {user && loading ? (
            <Skeleton className='h-11 w-full sm:h-8 sm:w-20' aria-hidden />
          ) : recruiterOrAdmin ? (
            ownsBeonelyListing ? (
              <Button
                asChild
                size='sm'
                variant='outline'
                className='min-h-11 w-full sm:min-h-8 sm:w-auto'
              >
                <Link
                  to='/recruiter/jobs/$jobId/applicants'
                  params={{ jobId: job.id }}
                >
                  Applicants
                </Link>
              </Button>
            ) : null
          ) : (
            <Button
              asChild
              size='sm'
              variant='secondary'
              className='min-h-11 w-full sm:min-h-8 sm:w-auto'
            >
              <Link to='/jobs/$slug' params={{ slug: job.job_slug }}>
                Apply
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className='flex flex-wrap gap-2 text-xs text-muted-foreground'>
        {job.job_type && <Badge variant='outline'>{job.job_type}</Badge>}
        {job.employment_type && (
          <Badge variant='outline'>{job.employment_type}</Badge>
        )}
        {job.work_mode && <Badge variant='outline'>{job.work_mode}</Badge>}
      </CardContent>
    </Card>
  )
}
