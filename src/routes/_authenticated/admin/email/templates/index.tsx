import { createFileRoute } from '@tanstack/react-router'
import { AdminEmailTemplatesPage } from '@/features/admin/admin-email-templates-page'

export const Route = createFileRoute('/_authenticated/admin/email/templates/')({
  component: () => <AdminEmailTemplatesPage />,
})
