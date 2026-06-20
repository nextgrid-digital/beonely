import { ExternalLink } from 'lucide-react'
import { isLinkedInApplyJob } from '@/lib/jobs/apply-target'
import type { JobRow } from '@/lib/supabase/database.types'
import { Badge } from '@/components/ui/badge'
import { CompanyLogoAvatar } from '@/features/jobs/company-logo-avatar'

function websiteHostname(raw: string): string | null {
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return url.hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

/**
 * Compact employer summary for the job side-peek sidebar: logo, company name,
 * website link, and a source badge. Rendered as a plain block so it can sit
 * inside the sidebar's floating panel.
 */
export function JobCompanyCard({ job }: { job: JobRow }) {
  const website = job.company_website?.trim()
  const hostname = website ? websiteHostname(website) : null
  const sourceLabel = isLinkedInApplyJob(job) ? 'LinkedIn' : 'Beonely'

  return (
    <div className='space-y-3'>
      <div className='flex items-center gap-3'>
        <CompanyLogoAvatar
          companyName={job.company_name}
          logoUrl={job.company_logo}
          className='size-10'
        />
        <div className='min-w-0'>
          <p className='truncate font-medium'>{job.company_name}</p>
          <Badge variant='secondary' className='mt-1 text-[10px] uppercase'>
            {sourceLabel}
          </Badge>
        </div>
      </div>

      {hostname ? (
        <a
          href={website}
          target='_blank'
          rel='noopener noreferrer'
          className='flex items-center gap-2 text-sm text-foreground underline-offset-4 hover:underline'
        >
          <ExternalLink className='size-4 shrink-0' aria-hidden />
          <span className='min-w-0 truncate'>{hostname}</span>
        </a>
      ) : null}
    </div>
  )
}
