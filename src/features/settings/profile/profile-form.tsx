import { Link } from '@tanstack/react-router'
import { displayNameFromUser } from '@/lib/auth/display-name'
import { useAuth } from '@/context/auth-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function ProfileForm() {
  const { user, profile } = useAuth()
  const role = profile?.role ?? 'candidate'
  const destination =
    role === 'admin'
      ? '/admin'
      : role === 'recruiter'
        ? '/recruiter'
        : '/candidate/profile'
  const destinationLabel =
    role === 'admin'
      ? 'Open admin workspace'
      : role === 'recruiter'
        ? 'Manage recruiter profile'
        : 'Edit candidate profile'

  return (
    <div className='space-y-5'>
      <Card>
        <CardContent className='grid gap-5 p-5 sm:grid-cols-2'>
          <div>
            <p className='text-sm text-muted-foreground'>Name</p>
            <p className='mt-1 font-medium'>
              {user ? displayNameFromUser(user) : '—'}
            </p>
          </div>
          <div>
            <p className='text-sm text-muted-foreground'>Email</p>
            <p className='mt-1 font-medium break-all'>{user?.email ?? '—'}</p>
          </div>
          <div>
            <p className='text-sm text-muted-foreground'>Account type</p>
            <Badge variant='secondary' className='mt-1 capitalize'>
              {role}
            </Badge>
          </div>
          <div>
            <p className='text-sm text-muted-foreground'>Member since</p>
            <p className='mt-1 font-medium'>
              {user?.created_at
                ? new Date(user.created_at).toLocaleDateString()
                : '—'}
            </p>
          </div>
        </CardContent>
      </Card>

      <p className='text-sm text-muted-foreground'>
        Profile details are managed in your role-specific workspace so the
        public portfolio, applications, and recruiter listings stay in sync.
      </p>
      <Button asChild>
        <Link to={destination}>{destinationLabel}</Link>
      </Button>
    </div>
  )
}
