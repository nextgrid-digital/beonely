import { createFileRoute, Link } from '@tanstack/react-router'
import { Shield, Users } from 'lucide-react'
import { requireAdminBeforeLoad } from '@/lib/auth/route-guards'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/_authenticated/admin/')({
  beforeLoad: () => requireAdminBeforeLoad({ loginRedirectPath: '/admin' }),
  component: AdminHomePage,
})

function AdminHomePage () {
  return (
    <div className='space-y-6 px-4 py-6'>
      <div>
        <h1 className='text-2xl font-semibold tracking-tight'>Admin</h1>
        <p className='text-sm text-muted-foreground'>
          Moderate paid listings and manage recruiter accounts.
        </p>
      </div>
      <div className='flex flex-wrap gap-3'>
        <Button asChild variant='outline'>
          <Link to='/admin/jobs'>
            <Shield className='me-2 size-4' />
            Job moderation
          </Link>
        </Button>
        <Button asChild variant='outline'>
          <Link to='/users'>
            <Users className='me-2 size-4' />
            Users
          </Link>
        </Button>
      </div>
    </div>
  )
}
