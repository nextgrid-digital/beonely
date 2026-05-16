import { createFileRoute } from '@tanstack/react-router'
import { AdminCampaignDetailPage } from '@/features/admin/admin-campaign-detail-page'

export const Route = createFileRoute(
  '/_authenticated/admin/email/campaigns/$campaignId'
)({
  component: CampaignDetailRoute,
})

function CampaignDetailRoute() {
  const { campaignId } = Route.useParams()
  return <AdminCampaignDetailPage campaignId={campaignId} />
}
