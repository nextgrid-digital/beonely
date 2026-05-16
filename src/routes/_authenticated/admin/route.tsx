import { createFileRoute, Outlet } from '@tanstack/react-router'
import { requireAdminBeforeLoad } from '@/lib/auth/route-guards'

export const Route = createFileRoute('/_authenticated/admin')({
  beforeLoad: ({ location }) =>
    requireAdminBeforeLoad({ loginRedirectPath: location.pathname }),
  component: () => <Outlet />,
})
