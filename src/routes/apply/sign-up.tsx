import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/apply/sign-up')({
  beforeLoad: () => {
    throw redirect({
      to: '/sign-up',
      search: { intent: 'candidate' },
    })
  },
  component: () => null,
})
