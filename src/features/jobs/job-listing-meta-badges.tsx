import { formatJobEnumLabel } from '@/lib/jobs/job-enum-labels'
import { displaySalaryRange } from '@/lib/jobs/salary-range-format'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type JobListingMetaBadgesProps = {
  location?: string | null
  employmentType?: string | null
  workMode?: string | null
  experienceLevel?: string | null
  jobType?: string | null
  salaryRange?: string | null
  modules?: string[]
  certifications?: string[]
  skills?: string[]
  className?: string
}

export function JobListingMetaBadges(props: JobListingMetaBadgesProps) {
  const modules = props.modules ?? []
  const certifications = props.certifications ?? []
  const skills = props.skills ?? []
  const salaryLabel = displaySalaryRange(props.salaryRange)

  const hasPrimary =
    props.location ||
    props.employmentType ||
    props.workMode ||
    props.experienceLevel ||
    props.jobType ||
    props.salaryRange?.trim()

  const hasStructured =
    modules.length > 0 || certifications.length > 0 || skills.length > 0

  if (!hasPrimary && !hasStructured) return null

  return (
    <div className={cn('space-y-3', props.className)}>
      {hasPrimary ? (
        <div className='flex flex-wrap gap-2'>
          {props.location ? (
            <Badge variant='outline'>{props.location}</Badge>
          ) : null}
          {props.employmentType ? (
            <Badge variant='outline'>
              {formatJobEnumLabel(props.employmentType)}
            </Badge>
          ) : null}
          {props.workMode ? (
            <Badge variant='outline'>
              {formatJobEnumLabel(props.workMode)}
            </Badge>
          ) : null}
          {props.experienceLevel ? (
            <Badge variant='outline'>
              {formatJobEnumLabel(props.experienceLevel)}
            </Badge>
          ) : null}
          {props.jobType ? (
            <Badge variant='outline'>{formatJobEnumLabel(props.jobType)}</Badge>
          ) : null}
          {salaryLabel ? (
            <Badge variant='outline'>{salaryLabel}</Badge>
          ) : null}
        </div>
      ) : null}

      {modules.length > 0 ? (
        <div className='space-y-1.5'>
          <p className='text-xs font-medium text-muted-foreground'>Modules</p>
          <div className='flex flex-wrap gap-1.5'>
            {modules.map((m) => (
              <Badge key={m} variant='outline'>
                {m}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      {certifications.length > 0 ? (
        <div className='space-y-1.5'>
          <p className='text-xs font-medium text-muted-foreground'>
            Certifications
          </p>
          <div className='flex flex-wrap gap-1.5'>
            {certifications.map((c) => (
              <Badge key={c} variant='outline'>
                {c}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      {skills.length > 0 ? (
        <div className='space-y-1.5'>
          <p className='text-xs font-medium text-muted-foreground'>Skills</p>
          <div className='flex flex-wrap gap-1.5'>
            {skills.map((s) => (
              <Badge key={s} variant='secondary'>
                {s}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
