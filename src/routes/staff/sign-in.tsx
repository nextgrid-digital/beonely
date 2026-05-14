import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/staff/sign-in')({
  beforeLoad: () => {
    throw redirect({
      to: '/sign-in',
      search: { intent: 'admin' },
    })
  },
  component: () => null,
})
