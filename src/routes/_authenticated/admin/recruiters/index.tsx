import { createFileRoute } from '@tanstack/react-router'
import { AdminRecruitersPage } from '@/features/admin/admin-recruiters-page'

export const Route = createFileRoute('/_authenticated/admin/recruiters/')({
  component: AdminRecruitersPage,
})
