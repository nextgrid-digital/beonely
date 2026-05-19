import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export type JobListingShellProps = {
  className?: string
  /** Optional label above the listing (e.g. "Candidate preview"). */
  banner?: ReactNode
  logo: ReactNode
  title: ReactNode
  company: ReactNode
  meta: ReactNode
  body: ReactNode
}

/**
 * Shared job listing layout for public view, recruiter preview, and inline edit.
 */
export function JobListingShell(props: JobListingShellProps) {
  return (
    <div className={cn('min-w-0', props.className)}>
      {props.banner ? <div className='mb-3'>{props.banner}</div> : null}
      <Card className='min-w-0 overflow-hidden border-0 shadow-none'>
        <CardHeader className='space-y-4 px-0 pb-4'>
          <div className='flex min-w-0 gap-4'>
            <div className='shrink-0'>{props.logo}</div>
            <div className='min-w-0 flex-1'>
              {props.title}
              {props.company}
              {props.meta}
            </div>
          </div>
        </CardHeader>
        <CardContent className='min-w-0 px-0 pt-4'>{props.body}</CardContent>
      </Card>
    </div>
  )
}

export function JobListingAboutSection(props: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={props.className}>
      <CardTitle className='mb-3 text-base'>About this role</CardTitle>
      {props.children}
    </div>
  )
}
