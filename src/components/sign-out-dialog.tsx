import { useNavigate, useLocation } from '@tanstack/react-router'
import { useAuth } from '@/context/auth-provider'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { isPublicMarketingPath } from '@/lib/auth/public-marketing-path'

interface SignOutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SignOutDialog ({ open, onOpenChange }: SignOutDialogProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    const currentPath = location.pathname
    if (isPublicMarketingPath(currentPath)) {
      return
    }
    navigate({
      to: '/sign-in',
      search: { redirect: currentPath },
      replace: true,
    })
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title='Sign out'
      desc='Are you sure you want to sign out? You will need to sign in again to access your account.'
      confirmText='Sign out'
      destructive
      handleConfirm={handleSignOut}
      className='sm:max-w-sm'
    />
  )
}
