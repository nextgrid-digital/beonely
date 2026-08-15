import { createFileRoute } from '@tanstack/react-router'
import { RecruiterJobEditorPage } from '@/features/recruiter/recruiter-job-editor-page'
import { useRecruiterJobWorkspace } from '@/features/recruiter/recruiter-job-workspace-context'

export const Route = createFileRoute(
  '/_authenticated/recruiter/jobs/$jobId/edit'
)({
  component: RecruiterJobEditRoute,
})

function RecruiterJobEditRoute() {
  const { recruiter, job } = useRecruiterJobWorkspace()
  return <RecruiterJobEditorPage recruiter={recruiter} job={job} embedded />
}
