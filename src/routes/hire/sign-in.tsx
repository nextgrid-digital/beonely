import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/hire/sign-in')({
  beforeLoad: () => {
    throw redirect({
      to: '/sign-in',
      search: { intent: 'recruiter' },
    })
  },
  component: () => null,
})
