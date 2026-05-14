import { createFileRoute } from '@tanstack/react-router'
import { SignIn } from '@/features/auth/sign-in'
import { authPersonaSearchSchema } from '@/lib/auth/sign-in-intent'

export const Route = createFileRoute('/(auth)/sign-in')({
  component: SignIn,
  validateSearch: authPersonaSearchSchema,
})
