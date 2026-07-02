import { useNavigate, useRouter } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export function NotFoundError() {
  const navigate = useNavigate()
  const { history } = useRouter()

  const goHome = () => {
    void navigate({ to: '/', replace: true })
  }

  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      history.go(-1)
      return
    }

    goHome()
  }

  return (
    <div className='h-svh'>
      <div className='m-auto flex h-full w-full flex-col items-center justify-center gap-2'>
        <h1 className='text-[7rem] leading-tight font-bold'>404</h1>
        <span className='font-medium'>Oops! Page Not Found!</span>
        <p className='text-center text-muted-foreground'>
          It seems like the page you're looking for <br />
          does not exist or might have been removed.
        </p>
        <div className='mt-6 flex gap-4'>
          <Button variant='outline' onClick={goBack}>
            Go Back
          </Button>
          <Button onClick={goHome}>Back to Home</Button>
        </div>
      </div>
    </div>
  )
}
