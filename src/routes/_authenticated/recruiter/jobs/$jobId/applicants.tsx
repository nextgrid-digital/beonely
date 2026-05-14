import { createFileRoute } from '@tanstack/react-router'
import { RecruiterJobApplicants } from '@/features/recruiter/recruiter-job-applicants'

export const Route = createFileRoute(
  '/_authenticated/recruiter/jobs/$jobId/applicants'
)({
  component: RecruiterJobApplicantsRoute,
})

function RecruiterJobApplicantsRoute() {
  const { jobId } = Route.useParams()
  return <RecruiterJobApplicants jobId={jobId} />
}
