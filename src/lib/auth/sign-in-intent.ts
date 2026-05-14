import { z } from 'zod'

export const signInIntentSchema = z.enum(['candidate', 'recruiter', 'admin'])
export type SignInIntent = z.infer<typeof signInIntentSchema>

/** Shared search params for `/sign-in` and `/sign-up` persona entry points. */
export const authPersonaSearchSchema = z.object({
  redirect: z.string().optional(),
  intent: signInIntentSchema.optional(),
})

export type AuthPersonaSearch = z.infer<typeof authPersonaSearchSchema>

export function signInCardTitle(intent: SignInIntent | undefined): string {
  switch (intent) {
    case 'recruiter':
      return 'Recruiter sign in'
    case 'admin':
      return 'Staff sign in'
    case 'candidate':
      return 'Candidate sign in'
    default:
      return 'Sign in'
  }
}

export function signInCardDescription(
  intent: SignInIntent | undefined
): string {
  switch (intent) {
    case 'recruiter':
      return 'Sign in to manage your company profile, create drafts, and pay to publish listings on Beonely.'
    case 'admin':
      return 'Internal use only. Your account must already be provisioned with admin access in Beonely.'
    case 'candidate':
      return 'Sign in to save jobs, track applications, and update your candidate profile.'
    default:
      return "Enter your email and password below to log into your account. Don't have an account? Use Sign up below."
  }
}

export function signUpCardTitle(intent: SignInIntent | undefined): string {
  switch (intent) {
    case 'recruiter':
      return 'Create a hiring account'
    case 'admin':
      return 'Create an account'
    case 'candidate':
      return 'Create a candidate account'
    default:
      return 'Create an account'
  }
}

export function signUpCardDescription(
  intent: SignInIntent | undefined
): string {
  switch (intent) {
    case 'recruiter':
      return 'After you sign up, you will set up your company on the recruiter dashboard and can post paid listings.'
    case 'admin':
      return 'New accounts are candidates by default. Admin access is assigned separately by your team in Supabase.'
    case 'candidate':
      return 'Create an account to save jobs, apply, and manage your ServiceNow-focused profile.'
    default:
      return 'Enter your email and password to create an account.'
  }
}
