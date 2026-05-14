import { describe, expect, it } from 'vitest'
import {
  isRecruiterSignUpMetadata,
  signUpAuthDataFields,
  signUpUserTypeFromMetadata,
  userTypeForSignUp,
} from '@/lib/auth/user-account-type'

describe('userTypeForSignUp', () => {
  it('maps recruiter intent', () => {
    expect(userTypeForSignUp('recruiter')).toBe('recruiter')
  })

  it('defaults to candidate', () => {
    expect(userTypeForSignUp(undefined)).toBe('candidate')
    expect(userTypeForSignUp('candidate')).toBe('candidate')
  })
})

describe('signUpAuthDataFields', () => {
  it('dual-writes user_type and registration_intent', () => {
    expect(signUpAuthDataFields('recruiter')).toEqual({
      user_type: 'recruiter',
      registration_intent: 'recruiter',
    })
    expect(signUpAuthDataFields(undefined)).toEqual({
      user_type: 'candidate',
      registration_intent: 'candidate',
    })
  })
})

describe('signUpUserTypeFromMetadata', () => {
  it('prefers user_type over legacy registration_intent', () => {
    expect(
      signUpUserTypeFromMetadata({
        user_metadata: {
          user_type: 'candidate',
          registration_intent: 'recruiter',
        },
      })
    ).toBe('candidate')
  })

  it('reads legacy registration_intent when user_type is absent', () => {
    expect(
      signUpUserTypeFromMetadata({
        user_metadata: { registration_intent: 'recruiter' },
      })
    ).toBe('recruiter')
  })

  it('defaults to candidate when missing or unknown', () => {
    expect(signUpUserTypeFromMetadata(null)).toBe('candidate')
    expect(signUpUserTypeFromMetadata(undefined)).toBe('candidate')
    expect(
      signUpUserTypeFromMetadata({ user_metadata: { user_type: 'other' } })
    ).toBe('candidate')
  })
})

describe('isRecruiterSignUpMetadata', () => {
  it('is true for user_type recruiter', () => {
    expect(
      isRecruiterSignUpMetadata({
        user_metadata: { user_type: 'recruiter' },
      })
    ).toBe(true)
  })

  it('is true for legacy registration_intent recruiter only', () => {
    expect(
      isRecruiterSignUpMetadata({
        user_metadata: { registration_intent: 'recruiter' },
      })
    ).toBe(true)
  })

  it('is false for candidate', () => {
    expect(
      isRecruiterSignUpMetadata({
        user_metadata: { user_type: 'candidate' },
      })
    ).toBe(false)
  })
})
