import { createFileRoute } from '@tanstack/react-router'
import { authPersonaSearchSchema } from '@/lib/auth/sign-in-intent'
import { SignUp } from '@/features/auth/sign-up'

export const Route = createFileRoute('/(auth)/sign-up')({
  component: SignUp,
  validateSearch: authPersonaSearchSchema,
})
