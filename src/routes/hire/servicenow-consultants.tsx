import { createFileRoute } from '@tanstack/react-router'
import { HiringRoleGuidePage } from '@/features/jobs/hiring-guides'

export const Route = createFileRoute('/hire/servicenow-consultants')({
  component: ConsultantsGuidePage,
})

function ConsultantsGuidePage() {
  return <HiringRoleGuidePage path='/hire/servicenow-consultants' />
}
