import { Link } from '@tanstack/react-router'
import type { JobRow } from '@/lib/supabase/database.types'
import { plainTextFromJobDescription } from '@/lib/jobs/sanitize-job-description-html'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

function companyInitials(name: string): string {
  const t = name.trim()
  if (!t) return '?'
  const parts = t.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return t.slice(0, 2).toUpperCase()
}

/** Single-line-ish plain text for card excerpt (HTML descriptions are flattened first). */
function excerptPlain(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

export function PublicJobCard({ job }: { job: JobRow }) {
  const logoUrl = job.company_logo?.trim()
  const hasLogo = Boolean(logoUrl)
  const descriptionExcerpt = excerptPlain(
    plainTextFromJobDescription(job.job_description ?? '')
  )

  return (
    <Card
      className={cn(
        'rounded-none border-0 border-b border-border bg-card shadow-none',
        job.featured && 'border-primary/40 bg-primary/[0.03]'
      )}
    >
      <CardHeader className='flex flex-row items-start justify-between gap-4 space-y-0 pb-2'>
        <div className='flex min-w-0 flex-1 gap-3'>
          <Avatar className='size-11 shrink-0 rounded-md border border-border/60 bg-muted/30'>
            {hasLogo && (
              <AvatarImage
                src={logoUrl}
                alt={`${job.company_name} logo`}
                className='object-cover'
                loading='lazy'
              />
            )}
            <AvatarFallback className='rounded-md bg-muted text-xs font-semibold text-muted-foreground uppercase'>
              {companyInitials(job.company_name)}
            </AvatarFallback>
          </Avatar>
          <div className='min-w-0 flex-1'>
            <div className='flex flex-wrap items-center gap-2'>
              <h2 className='text-lg leading-tight font-medium'>
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
        <Button asChild size='sm' variant='secondary'>
          <Link to='/jobs/$slug' params={{ slug: job.job_slug }}>
            Apply
          </Link>
        </Button>
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
