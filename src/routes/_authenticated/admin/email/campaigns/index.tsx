import { createFileRoute } from '@tanstack/react-router'
import { AdminCampaignsPage } from '@/features/admin/admin-campaigns-page'

export const Route = createFileRoute('/_authenticated/admin/email/campaigns/')({
  component: AdminCampaignsPage,
})
