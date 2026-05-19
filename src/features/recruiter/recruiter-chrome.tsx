import { useRouterState } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { useRecruiterChromeActionsSlot } from '@/features/recruiter/recruiter-chrome-actions-context'
import { RecruiterJobWorkspaceTabs } from '@/features/recruiter/recruiter-job-workspace-tabs'
import {
  recruiterJobWorkspaceJobId,
  recruiterJobWorkspaceTab,
} from '@/features/recruiter/recruiter-nav-ia'

export function RecruiterChrome() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const actions = useRecruiterChromeActionsSlot()
  const workspaceTab = recruiterJobWorkspaceTab(pathname)
  const workspaceJobId = recruiterJobWorkspaceJobId(pathname)
  const workspaceTabs =
    workspaceTab && workspaceJobId ? (
      <RecruiterJobWorkspaceTabs
        jobId={workspaceJobId}
        activeTab={workspaceTab}
      />
    ) : null

  if (!workspaceTabs && !actions) {
    return null
  }

  return (
    <div
      className={cn(
        'sticky top-14 z-40 -mx-4 mb-6 border-b border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 motion-reduce:transition-none'
      )}
    >
      <div className='flex flex-wrap items-center gap-3'>
        {workspaceTabs}
        {actions ? (
          <div className='ms-auto flex shrink-0 items-center gap-2'>
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  )
}
