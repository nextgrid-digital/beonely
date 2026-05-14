import type { User } from '@supabase/supabase-js'
import type { SignInIntent } from '@/lib/auth/sign-in-intent'

/** Canonical auth metadata key set at sign-up (`signUp({ options: { data } })`). */
export const USER_TYPE_METADATA_KEY = 'user_type' as const

/** Legacy key — still read for older accounts. */
export const LEGACY_REGISTRATION_INTENT_METADATA_KEY =
  'registration_intent' as const

export type SignUpUserType = 'candidate' | 'recruiter'

export function userTypeForSignUp(
  intent: SignInIntent | undefined
): SignUpUserType {
  return intent === 'recruiter' ? 'recruiter' : 'candidate'
}

/** Fields to merge into `signUp` `options.data` (dual-write for legacy clients). */
export function signUpAuthDataFields(intent: SignInIntent | undefined) {
  const t = userTypeForSignUp(intent)
  return {
    [USER_TYPE_METADATA_KEY]: t,
    [LEGACY_REGISTRATION_INTENT_METADATA_KEY]: t,
  } as const
}

/**
 * Resolves sign-up persona from auth user_metadata.
 * Prefers `user_type`, then legacy `registration_intent`.
 */
export function signUpUserTypeFromMetadata(
  user: Pick<User, 'user_metadata'> | null | undefined
): SignUpUserType {
  const meta = user?.user_metadata
  const raw =
    meta?.[USER_TYPE_METADATA_KEY] ??
    meta?.[LEGACY_REGISTRATION_INTENT_METADATA_KEY]
  if (raw === 'recruiter') return 'recruiter'
  return 'candidate'
}

/** True when the user registered as a recruiter but may not have a `recruiters` row yet. */
export function isRecruiterSignUpMetadata(
  user: Pick<User, 'user_metadata'> | null | undefined
): boolean {
  return signUpUserTypeFromMetadata(user) === 'recruiter'
}
