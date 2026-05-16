import { createFileRoute } from '@tanstack/react-router'
import { AdminEmailOverviewPage } from '@/features/admin/admin-email-overview-page'

export const Route = createFileRoute('/_authenticated/admin/email/')({
  component: AdminEmailOverviewPage,
})
