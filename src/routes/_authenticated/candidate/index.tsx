import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/candidate/')({
  beforeLoad: () => {
    throw redirect({
      to: '/candidate/profile',
      replace: true,
    })
  },
  component: () => null,
})
