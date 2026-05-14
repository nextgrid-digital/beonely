import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/hire/sign-up')({
  beforeLoad: () => {
    throw redirect({
      to: '/sign-up',
      search: { intent: 'recruiter' },
    })
  },
  component: () => null,
})
