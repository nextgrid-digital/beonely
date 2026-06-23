import { createFileRoute } from '@tanstack/react-router'
import { HiringRoleGuidePage } from '@/features/jobs/hiring-guides'

export const Route = createFileRoute('/hire/contract-servicenow-talent')({
  component: ContractTalentGuidePage,
})

function ContractTalentGuidePage() {
  return <HiringRoleGuidePage path='/hire/contract-servicenow-talent' />
}
