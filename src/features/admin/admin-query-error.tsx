import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

type AdminQueryErrorProps = {
  title: string
  error?: unknown
  onRetry: () => void
  retrying?: boolean
}

export function AdminQueryError({
  title,
  error,
  onRetry,
  retrying = false,
}: AdminQueryErrorProps) {
  return (
    <Alert variant='destructive'>
      <AlertCircle className='size-4' aria-hidden />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p>{error instanceof Error ? error.message : 'Please try again.'}</p>
        <Button
          type='button'
          size='sm'
          variant='outline'
          disabled={retrying}
          onClick={onRetry}
        >
          {retrying ? 'Retrying…' : 'Try again'}
        </Button>
      </AlertDescription>
    </Alert>
  )
}
