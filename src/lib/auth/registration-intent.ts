import {
  LEGACY_REGISTRATION_INTENT_METADATA_KEY,
  isRecruiterSignUpMetadata,
  userTypeForSignUp,
  type SignUpUserType,
} from '@/lib/auth/user-account-type'

/** @deprecated Prefer the canonical `user_type` metadata key from `@/lib/auth/user-account-type`. */
export const REGISTRATION_INTENT_METADATA_KEY =
  LEGACY_REGISTRATION_INTENT_METADATA_KEY

export type RegistrationIntentValue = SignUpUserType

export const registrationIntentForSignUp = userTypeForSignUp

export const isRecruiterRegistrationMetadata = isRecruiterSignUpMetadata
