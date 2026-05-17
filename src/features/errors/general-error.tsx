import { useNavigate, useRouter } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/auth-provider'
import { Button } from '@/components/ui/button'

type GeneralErrorProps = React.HTMLAttributes<HTMLDivElement> & {
  minimal?: boolean
}

export function GeneralError({
  className,
  minimal = false,
}: GeneralErrorProps) {
  const navigate = useNavigate()
  const { history } = useRouter()
  const { profile, signOut } = useAuth()
  const homeTarget =
    profile?.role === 'admin'
      ? '/admin'
      : profile?.role === 'recruiter'
        ? '/recruiter'
        : '/'
  const homeLabel =
    profile?.role === 'admin'
      ? 'Back to Admin'
      : profile?.role === 'recruiter'
        ? 'Back to Recruiter Home'
        : 'Back to Home'

  const signInAgain = async () => {
    try {
      await signOut()
    } catch {
      // Continue to sign-in route even if sign-out fails.
    }
    void navigate({ to: '/sign-in', search: { redirect: homeTarget } })
  }

  return (
    <div className={cn('h-svh w-full', className)}>
      <div className='m-auto flex h-full w-full flex-col items-center justify-center gap-2'>
        {!minimal && (
          <h1 className='text-[7rem] leading-tight font-bold'>500</h1>
        )}
        <span className='font-medium'>Oops! Something went wrong {`:')`}</span>
        <p className='text-center text-muted-foreground'>
          We apologize for the inconvenience. <br /> Please try again later.
        </p>
        {!minimal && (
          <div className='mt-6 flex gap-4'>
            <Button variant='outline' onClick={() => history.go(-1)}>
              Go Back
            </Button>
            <Button onClick={() => navigate({ to: homeTarget })}>
              {homeLabel}
            </Button>
            <Button variant='secondary' onClick={() => void signInAgain()}>
              Sign in again
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
