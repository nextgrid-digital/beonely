import { createFileRoute } from '@tanstack/react-router'
import { AdminEmailAnalyticsPage } from '@/features/admin/admin-email-analytics-page'

export const Route = createFileRoute('/_authenticated/admin/email/analytics')({
  component: AdminEmailAnalyticsPage,
})
