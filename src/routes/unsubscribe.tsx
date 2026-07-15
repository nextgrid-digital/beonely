import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  PublicSiteFooter,
  PublicSiteHeader,
} from '@/features/jobs/public-site-layout'

const searchSchema = z.object({
  token: z.string().optional(),
})

export const Route = createFileRoute('/unsubscribe')({
  validateSearch: searchSchema,
  component: UnsubscribePage,
})

function UnsubscribePage() {
  const { token } = Route.useSearch()
  const trimmedToken = token?.trim() ?? ''
  const hasToken = trimmedToken.length > 0

  const unsubscribe = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: trimmedToken }),
      })
      if (!res.ok) throw new Error('unsubscribe_failed')
      return true
    },
  })

  const status = !hasToken
    ? 'error'
    : unsubscribe.isPending
      ? 'loading'
      : unsubscribe.isSuccess
        ? 'ok'
        : unsubscribe.isError
          ? 'error'
          : 'idle'

  return (
    <div className='flex min-h-svh flex-col'>
      <PublicSiteHeader />
      <main
        id='main-content'
        className='mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-16'
      >
        <h1 className='text-2xl font-semibold tracking-tight'>Unsubscribe</h1>
        {status === 'idle' ? (
          <>
            <p className='mt-4 text-sm text-muted-foreground'>
              Confirm to stop Beonely marketing emails. Account and application
              messages may still be sent.
            </p>
            <button
              type='button'
              className='mt-6 inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground'
              onClick={() => unsubscribe.mutate()}
            >
              Confirm unsubscribe
            </button>
          </>
        ) : null}
        {status === 'loading' ? (
          <p className='mt-4 text-sm text-muted-foreground'>Processing…</p>
        ) : null}
        {status === 'ok' ? (
          <p className='mt-4 text-sm text-muted-foreground'>
            You are unsubscribed from Beonely marketing emails. Transactional
            messages about your account may still be sent.
          </p>
        ) : null}
        {status === 'error' ? (
          <p className='mt-4 text-sm text-destructive'>
            This link is invalid or expired.
          </p>
        ) : null}
        <Link
          to='/'
          className='mt-6 text-sm font-medium text-primary underline-offset-4 hover:underline'
        >
          Back to Beonely
        </Link>
      </main>
      <PublicSiteFooter />
    </div>
  )
}
