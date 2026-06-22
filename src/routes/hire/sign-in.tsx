import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { sameOriginReferrerPath } from '@/lib/auth/redirect-path'

function IntentEntryRedirect({
  intent,
}: {
  intent: 'candidate' | 'recruiter'
}) {
  const navigate = useNavigate()

  useEffect(() => {
    const redirect = sameOriginReferrerPath()
    void navigate({
      to: '/sign-in',
      search: {
        intent,
        ...(redirect ? { redirect } : {}),
      },
      replace: true,
    })
  }, [intent, navigate])

  return null
}

export const Route = createFileRoute('/hire/sign-in')({
  component: () => <IntentEntryRedirect intent='recruiter' />,
})
