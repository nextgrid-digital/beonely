import { createFileRoute } from '@tanstack/react-router'
import { SignUp } from '@/features/auth/sign-up'
import { authPersonaSearchSchema } from '@/lib/auth/sign-in-intent'

export const Route = createFileRoute('/(auth)/sign-up')({
  component: SignUp,
  validateSearch: authPersonaSearchSchema,
})
