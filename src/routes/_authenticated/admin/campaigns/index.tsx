import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/admin/campaigns/')({
  beforeLoad: () => {
    throw redirect({ to: '/admin/email/campaigns' })
  },
})
