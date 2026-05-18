import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { PublicSiteFooter, PublicSiteHeader } from '@/features/jobs/public-site-layout'

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

  const unsubscribeQuery = useQuery({
    queryKey: ['unsubscribe', trimmedToken],
    enabled: hasToken,
    retry: false,
    queryFn: async () => {
      const res = await fetch(
        `/api/unsubscribe?token=${encodeURIComponent(trimmedToken)}`
      )
      if (!res.ok) throw new Error('unsubscribe_failed')
      return true
    },
  })

  const status = !hasToken
    ? 'error'
    : unsubscribeQuery.isPending
      ? 'loading'
      : unsubscribeQuery.isSuccess
        ? 'ok'
        : unsubscribeQuery.isError
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
