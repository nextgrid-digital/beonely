import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
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
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>(
    'idle'
  )

  useEffect(() => {
    if (!token?.trim()) {
      setStatus('error')
      return
    }
    setStatus('loading')
    void fetch(`/api/unsubscribe?token=${encodeURIComponent(token)}`)
      .then((res) => {
        if (res.ok) setStatus('ok')
        else setStatus('error')
      })
      .catch(() => setStatus('error'))
  }, [token])

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
        <Link to='/' className='mt-6 text-sm font-medium text-primary underline-offset-4 hover:underline'>
          Back to Beonely
        </Link>
      </main>
      <PublicSiteFooter />
    </div>
  )
}
