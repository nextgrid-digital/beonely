import { createFileRoute } from '@tanstack/react-router'
import { HiringRoleGuidePage } from '@/features/jobs/hiring-guides'

export const Route = createFileRoute('/hire/remote-servicenow-talent')({
  component: RemoteTalentGuidePage,
})

function RemoteTalentGuidePage() {
  return <HiringRoleGuidePage path='/hire/remote-servicenow-talent' />
}
