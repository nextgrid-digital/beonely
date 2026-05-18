import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { AdminCampaignWizardPage } from '@/features/admin/admin-campaign-wizard-page'
import type { Database } from '@/lib/supabase/database.types'

const searchSchema = z.object({
  templateId: z.string().uuid().optional(),
  audience: z
    .enum(['candidates', 'recruiters', 'newsletter', 'all_marketing'])
    .optional(),
})

export const Route = createFileRoute('/_authenticated/admin/email/campaigns/new')({
  validateSearch: searchSchema,
  component: CampaignNewRoute,
})

function CampaignNewRoute() {
  const search = Route.useSearch()
  return (
    <AdminCampaignWizardPage
      initialTemplateId={search.templateId}
      initialAudience={
        search.audience as
          | Database['public']['Enums']['campaign_audience']
          | undefined
      }
    />
  )
}
