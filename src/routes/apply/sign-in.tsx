import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/apply/sign-in')({
  beforeLoad: () => {
    throw redirect({
      to: '/sign-in',
      search: { intent: 'candidate' },
    })
  },
  component: () => null,
})
