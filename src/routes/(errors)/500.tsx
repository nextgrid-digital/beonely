import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/(errors)/500')({
  beforeLoad: () => {
    throw redirect({ to: '/' })
  },
})
