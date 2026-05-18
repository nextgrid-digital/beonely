import { createFileRoute } from '@tanstack/react-router'
import { AdminEmailAutomationsPage } from '@/features/admin/admin-email-automations-page'

export const Route = createFileRoute('/_authenticated/admin/email/automations')(
  {
    component: AdminEmailAutomationsPage,
  }
)
