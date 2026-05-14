import { createFileRoute } from '@tanstack/react-router'
import { authPersonaSearchSchema } from '@/lib/auth/sign-in-intent'
import { SignIn } from '@/features/auth/sign-in'

export const Route = createFileRoute('/(auth)/sign-in')({
  component: SignIn,
  validateSearch: authPersonaSearchSchema,
})
