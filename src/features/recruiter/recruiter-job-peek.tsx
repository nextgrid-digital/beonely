import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ExternalLink, Pencil, Users } from 'lucide-react'
import { jobListingIsLive } from '@/lib/jobs/job-listing-live'
import type { JobRow } from '@/lib/supabase/database.types'
import { Button } from '@/components/ui/button'
import { PeekPanel } from '@/components/peek/peek-panel'
import { JobDescriptionRichTextRead } from '@/features/jobs/job-description-rich-text-field'
import { JobListingMetaBadges } from '@/features/jobs/job-listing-meta-badges'

/** Read-only job summary peek for the recruiter jobs list. Editing stays on the full page. */
export function RecruiterJobPeek({
  job,
  open,
  onOpenChange,
  applicantCount,
  actions,
}: {
  job: JobRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
  applicantCount: number
  /** Listing actions (Pay / Feature / Extend) surfaced inside the peek body. */
  actions?: ReactNode
}) {
  const isLive = job ? jobListingIsLive(job) : false

  return (
    <PeekPanel
      open={open}
      onOpenChange={onOpenChange}
      title={job?.job_title?.trim() || 'Untitled job'}
      description={
        job
          ? `${job.company_name}${job.location ? ` · ${job.location}` : ''}`
          : undefined
      }
      headerActions={
        job ? (
          <Button asChild variant='ghost' size='sm' className='gap-1.5'>
            <Link to='/recruiter/jobs/$jobId/edit' params={{ jobId: job.id }}>
              <Pencil className='size-4' />
              Edit
            </Link>
          </Button>
        ) : null
      }
      bodyClassName='space-y-6 px-4 py-5 sm:px-6'
    >
      {job ? (
        <>
          <div className='flex flex-wrap items-center gap-2'>
            <Button asChild variant='outline' size='sm' className='gap-1.5'>
              <Link
                to='/recruiter/jobs/$jobId/applicants'
                params={{ jobId: job.id }}
              >
                <Users className='size-4' />
                View applicants ({applicantCount})
              </Link>
            </Button>
            {isLive ? (
              <Button asChild variant='outline' size='sm' className='gap-1.5'>
                <Link
                  to='/jobs/$slug'
                  params={{ slug: job.job_slug }}
                  target='_blank'
                >
                  <ExternalLink className='size-4' />
                  View public page
                </Link>
              </Button>
            ) : null}
          </div>

          {actions ? <div className='min-w-0'>{actions}</div> : null}

          <JobListingMetaBadges
            location={job.location}
            employmentType={job.employment_type}
            workMode={job.work_mode}
            experienceLevel={job.experience_level}
            jobType={job.job_type}
            salaryRange={job.salary_range}
            modules={job.modules}
            certifications={job.certifications}
            skills={job.skills}
          />

          <div className='min-w-0'>
            <h3 className='mb-2 text-sm font-medium text-foreground'>
              Description
            </h3>
            <JobDescriptionRichTextRead value={job.job_description} />
          </div>
        </>
      ) : null}
    </PeekPanel>
  )
}
