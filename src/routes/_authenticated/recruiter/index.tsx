import { createFileRoute } from '@tanstack/react-router'
import { RecruiterPortal } from '@/features/recruiter/recruiter-portal'

export const Route = createFileRoute('/_authenticated/recruiter/')({
  component: RecruiterPage,
})

function RecruiterPage() {
  return <RecruiterPortal />
}
