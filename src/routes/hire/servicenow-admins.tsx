import { createFileRoute } from '@tanstack/react-router'
import { HiringRoleGuidePage } from '@/features/jobs/hiring-guides'

export const Route = createFileRoute('/hire/servicenow-admins')({
  component: AdminsGuidePage,
})

function AdminsGuidePage() {
  return <HiringRoleGuidePage path='/hire/servicenow-admins' />
}
