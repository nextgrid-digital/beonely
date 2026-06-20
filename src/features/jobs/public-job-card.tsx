import { type MouseEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'
import { formatJobEnumLabel } from '@/lib/jobs/job-enum-labels'
import { plainTextFromJobDescription } from '@/lib/jobs/sanitize-job-description-html'
import type { JobRow } from '@/lib/supabase/database.types'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/auth-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CompanyLogoAvatar } from '@/features/jobs/company-logo-avatar'

/** Single-line-ish plain text for card excerpt (HTML descriptions are flattened first). */
function excerptPlain(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

export function PublicJobCard({
  job,
  onSelect,
}: {
  job: JobRow
  /** When provided, a plain left-click opens this job in-page (peek) instead of navigating. */
  onSelect?: (job: JobRow) => void
}) {
  const { profile, user, loading } = useAuth()
  const descriptionExcerpt = excerptPlain(
    plainTextFromJobDescription(job.job_description ?? '')
  )

  const handleTitleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!onSelect) return
    // Preserve new-tab / modified clicks and middle-click for the full page.
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return
    }
    event.preventDefault()
    onSelect(job)
  }

  const recruiterOrAdmin =
    profile?.role === 'recruiter' || profile?.role === 'admin'
  const ownsBeonelyListing =
    job.source_kind === 'recruiter_posted' &&
    profile?.recruiter_row_id === job.recruiter_id

  return (
    <Card
      className={cn(
        'group relative rounded-none border-0 border-b border-border bg-card shadow-none transition-colors hover:bg-muted/30',
        job.featured && 'border-primary/40 bg-primary/[0.03]'
      )}
    >
      <CardHeader className='flex flex-row items-start justify-between gap-3 space-y-0 pb-2 sm:gap-4'>
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
                  onClick={handleTitleClick}
                  className='rounded-sm group-hover:underline after:absolute after:inset-0 after:content-[""] focus-visible:underline focus-visible:outline-none'
                >
                  {job.job_title}
                </Link>
              </h2>
              {job.featured && (
                <Badge variant='default' className='text-[10px] uppercase'>
                  Featured
                </Badge>
              )}
            </div>
            <p className='text-sm text-muted-foreground'>
              {job.company_name} · {job.location || 'Location TBD'}
            </p>
            {descriptionExcerpt ? (
              <p className='mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground'>
                {descriptionExcerpt}
              </p>
            ) : null}
          </div>
        </div>
        <div className='shrink-0'>
          {user && loading ? (
            <Skeleton className='size-9 rounded-full' aria-hidden />
          ) : recruiterOrAdmin && ownsBeonelyListing ? (
            <Button
              asChild
              size='sm'
              variant='outline'
              className='relative z-10 min-h-9 sm:min-h-8'
            >
              <Link
                to='/recruiter/jobs/$jobId/applicants'
                params={{ jobId: job.id }}
              >
                Applicants
              </Link>
            </Button>
          ) : recruiterOrAdmin ? null : (
            <span
              aria-hidden
              className='pointer-events-none grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground'
            >
              <ArrowUpRight className='size-4' />
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className='flex flex-wrap gap-2 text-xs text-muted-foreground'>
        {job.job_type && (
          <Badge variant='outline'>{formatJobEnumLabel(job.job_type)}</Badge>
        )}
        {job.employment_type && (
          <Badge variant='outline'>
            {formatJobEnumLabel(job.employment_type)}
          </Badge>
        )}
        {job.work_mode && (
          <Badge variant='outline'>{formatJobEnumLabel(job.work_mode)}</Badge>
        )}
      </CardContent>
    </Card>
  )
}
