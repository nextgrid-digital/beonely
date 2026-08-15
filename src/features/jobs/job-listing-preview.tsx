import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CompanyLogoAvatar } from '@/features/jobs/company-logo-avatar'
import { JobDescriptionRichTextRead } from '@/features/jobs/job-description-rich-text-field'
import { JobListingMetaBadges } from '@/features/jobs/job-listing-meta-badges'
import {
  JobListingAboutSection,
  JobListingShell,
} from '@/features/jobs/job-listing-shell'

export type JobListingPreviewData = {
  title: string
  company: string
  companyLogo?: string
  location?: string
  employmentType?: string
  workMode?: string
  experienceLevel?: string
  jobType?: string
  salaryRange?: string
  modules?: string[]
  certifications?: string[]
  skills?: string[]
  description?: string
}

export function JobListingPreview(props: {
  data: JobListingPreviewData
  className?: string
  /** Allow an editor-created blob URL that never reaches the public page. */
  allowLocalLogoPreview?: boolean
  /** When true, shows "Candidate preview" label above the listing. */
  showBanner?: boolean
  /** `public` matches the live job detail page typography. */
  variant?: 'compact' | 'public'
}) {
  const { data } = props
  const variant = props.variant ?? 'compact'
  const isPublic = variant === 'public'
  const title = data.title.trim() || 'Job title'
  const company = data.company.trim() || 'Company name'

  const meta = (
    <JobListingMetaBadges
      className='mt-3'
      location={data.location}
      employmentType={data.employmentType}
      workMode={data.workMode}
      experienceLevel={data.experienceLevel}
      jobType={data.jobType}
      salaryRange={data.salaryRange}
      modules={data.modules}
      certifications={data.certifications}
      skills={data.skills}
    />
  )

  const descriptionBody = data.description?.trim() ? (
    <JobDescriptionRichTextRead className='min-w-0' value={data.description} />
  ) : (
    <p className='text-sm text-muted-foreground'>
      Add a description to preview how candidates will read this listing.
    </p>
  )

  if (isPublic) {
    return (
      <div className={cn('min-w-0 space-y-6', props.className)}>
        {props.showBanner ? (
          <p className='text-sm font-medium'>Candidate preview</p>
        ) : null}
        <div className='flex min-w-0 gap-4'>
          <CompanyLogoAvatar
            companyName={company}
            logoUrl={data.companyLogo?.trim() || null}
            allowLocalPreview={props.allowLocalLogoPreview}
            className='size-14 shrink-0'
          />
          <div className='min-w-0 flex-1'>
            <h1 className='text-2xl font-semibold tracking-tight break-words sm:text-3xl'>
              {title}
            </h1>
            <p className='mt-2 text-base text-muted-foreground sm:text-lg'>
              {company}
            </p>
            {meta}
          </div>
        </div>
        <Card className='border-0 shadow-none'>
          <CardHeader className='px-0'>
            <CardTitle>About this role</CardTitle>
          </CardHeader>
          <CardContent className='min-w-0 px-0'>{descriptionBody}</CardContent>
        </Card>
      </div>
    )
  }

  return (
    <JobListingShell
      className={cn('pt-6', props.className)}
      banner={
        props.showBanner ? (
          <p className='text-sm font-medium'>Candidate preview</p>
        ) : undefined
      }
      logo={
        <CompanyLogoAvatar
          companyName={company}
          logoUrl={data.companyLogo?.trim() || null}
          allowLocalPreview={props.allowLocalLogoPreview}
          className='size-14'
        />
      }
      title={
        <h2 className='text-xl font-semibold tracking-tight break-words'>
          {title}
        </h2>
      }
      company={<p className='mt-1 text-sm text-muted-foreground'>{company}</p>}
      meta={meta}
      body={<JobListingAboutSection>{descriptionBody}</JobListingAboutSection>}
    />
  )
}
