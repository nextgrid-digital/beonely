import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { requireAdminBeforeLoad } from '@/lib/auth/route-guards'
import { Users } from '@/features/users'

const adminAccountRoles = ['recruiter', 'admin'] as const

const usersSearchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(10),
  role: z
    .array(z.enum(adminAccountRoles))
    .optional()
    .catch([]),
  email: z.string().optional().catch(''),
})

export const Route = createFileRoute('/_authenticated/users/')({
  validateSearch: usersSearchSchema,
  beforeLoad: () => requireAdminBeforeLoad({ loginRedirectPath: '/users' }),
  component: Users,
})
