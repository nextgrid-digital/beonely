import { createFileRoute } from '@tanstack/react-router'
import { AdminHiringRequestsPage } from '@/features/admin/admin-hiring-requests-page'

export const Route = createFileRoute('/_authenticated/admin/hiring-requests/')({
  component: AdminHiringRequestsRoute,
})

function AdminHiringRequestsRoute() {
  return <AdminHiringRequestsPage />
}
