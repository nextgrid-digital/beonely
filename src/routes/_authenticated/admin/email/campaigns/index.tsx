import { createFileRoute } from '@tanstack/react-router'
import { AdminCampaignsListPage } from '@/features/admin/admin-campaigns-list-page'

export const Route = createFileRoute('/_authenticated/admin/email/campaigns/')({
  component: AdminCampaignsListPage,
})
