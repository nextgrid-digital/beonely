import { createFileRoute } from '@tanstack/react-router'
import { HiringRoleGuidePage } from '@/features/jobs/hiring-guides'

export const Route = createFileRoute('/hire/servicenow-architects')({
  component: ArchitectsGuidePage,
})

function ArchitectsGuidePage() {
  return <HiringRoleGuidePage path='/hire/servicenow-architects' />
}
