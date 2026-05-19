import { Link } from '@tanstack/react-router'
import type { RecruiterJobWorkspaceTab } from '@/features/recruiter/recruiter-nav-ia'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function RecruiterJobWorkspaceTabs(props: {
  jobId: string
  activeTab: RecruiterJobWorkspaceTab
}) {
  return (
    <Tabs value={props.activeTab} className='gap-0'>
      <TabsList className='inline-flex h-7 w-auto gap-0 p-0.5 text-xs'>
        <TabsTrigger
          value='details'
          asChild
          className='h-6 px-2.5 py-0 text-xs font-medium'
        >
          <Link
            to='/recruiter/jobs/$jobId/edit'
            params={{ jobId: props.jobId }}
          >
            Job details
          </Link>
        </TabsTrigger>
        <TabsTrigger
          value='applicants'
          asChild
          className='h-6 px-2.5 py-0 text-xs font-medium'
        >
          <Link
            to='/recruiter/jobs/$jobId/applicants'
            params={{ jobId: props.jobId }}
          >
            Applicants
          </Link>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
