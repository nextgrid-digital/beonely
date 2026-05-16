import { createFileRoute } from '@tanstack/react-router'
import { AdminCandidatesPage } from '@/features/admin/admin-candidates-page'

export const Route = createFileRoute('/_authenticated/admin/candidates/')({
  component: AdminCandidatesPage,
})
