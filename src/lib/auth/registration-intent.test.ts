import { describe, expect, it } from 'vitest'
import {
  isRecruiterRegistrationMetadata,
  registrationIntentForSignUp,
} from '@/lib/auth/registration-intent'

describe('registrationIntentForSignUp', () => {
  it('maps recruiter intent', () => {
    expect(registrationIntentForSignUp('recruiter')).toBe('recruiter')
  })

  it('defaults to candidate', () => {
    expect(registrationIntentForSignUp(undefined)).toBe('candidate')
    expect(registrationIntentForSignUp('candidate')).toBe('candidate')
  })
})

describe('isRecruiterRegistrationMetadata', () => {
  it('is true when metadata user_type is recruiter', () => {
    expect(
      isRecruiterRegistrationMetadata({
        user_metadata: { user_type: 'recruiter' },
      })
    ).toBe(true)
  })

  it('is true when metadata registration_intent is recruiter', () => {
    expect(
      isRecruiterRegistrationMetadata({
        user_metadata: { registration_intent: 'recruiter' },
      })
    ).toBe(true)
  })

  it('is false otherwise', () => {
    expect(isRecruiterRegistrationMetadata(null)).toBe(false)
    expect(isRecruiterRegistrationMetadata(undefined)).toBe(false)
    expect(
      isRecruiterRegistrationMetadata({
        user_metadata: { registration_intent: 'candidate' },
      })
    ).toBe(false)
    expect(
      isRecruiterRegistrationMetadata({ user_metadata: {} })
    ).toBe(false)
  })
})
