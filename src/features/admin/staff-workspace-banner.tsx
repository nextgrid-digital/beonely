import { Link, useRouterState } from '@tanstack/react-router'
import { Shield } from 'lucide-react'
import { ADMIN_WORKSPACE_LABELS } from '@/lib/auth/admin-workspace'
import { useAdminWorkspace } from '@/context/admin-workspace-provider'
import { AdminWorkspaceSwitcher } from '@/features/admin/admin-workspace-switcher'
import { Button } from '@/components/ui/button'

export function StaffWorkspaceBanner() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { isStaffAdmin, workspace } = useAdminWorkspace()

  if (!isStaffAdmin || pathname.startsWith('/admin')) return null

  return (
    <div className='border-b border-amber-200 bg-amber-50 px-4 py-2 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100'>
      <div className='mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2'>
        <div className='flex items-center gap-2 text-sm'>
          <Shield className='size-4 shrink-0' aria-hidden />
          <span>
            Staff preview:{' '}
            <strong>{ADMIN_WORKSPACE_LABELS[workspace].label}</strong>
          </span>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <AdminWorkspaceSwitcher compact />
          <Button asChild size='sm' variant='outline' className='h-8'>
            <Link to='/admin'>Back to Admin</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
