import { createFileRoute } from '@tanstack/react-router'
import { HiringRoleGuidePage } from '@/features/jobs/hiring-guides'

export const Route = createFileRoute('/hire/servicenow-developers')({
  component: DevelopersGuidePage,
})

function DevelopersGuidePage() {
  return <HiringRoleGuidePage path='/hire/servicenow-developers' />
}
