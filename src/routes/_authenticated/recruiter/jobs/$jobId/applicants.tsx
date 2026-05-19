import { createFileRoute } from '@tanstack/react-router'
import { RecruiterJobApplicantsList } from '@/features/recruiter/recruiter-job-applicants'

export const Route = createFileRoute(
  '/_authenticated/recruiter/jobs/$jobId/applicants'
)({
  component: RecruiterJobApplicantsRoute,
})

function RecruiterJobApplicantsRoute() {
  return <RecruiterJobApplicantsList />
}
