import { createFileRoute } from '@tanstack/react-router'
import { AdminEmailTestPage } from '@/features/admin/admin-email-test-page'

export const Route = createFileRoute('/_authenticated/admin/email/test')({
  component: AdminEmailTestPage,
})
