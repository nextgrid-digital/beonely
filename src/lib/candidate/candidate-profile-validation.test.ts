import { describe, expect, it } from 'vitest'
import { isLinkedInProfileUrl } from '@/lib/candidate/linkedin-url'
import { isJobSeekerProfileComplete } from '@/lib/candidate/profile-completion'

describe('isLinkedInProfileUrl', () => {
  it('accepts https linkedin.com/in/ profile URLs', () => {
    expect(
      isLinkedInProfileUrl('https://www.linkedin.com/in/someone-123456/')
    ).toBe(true)
    expect(isLinkedInProfileUrl('https://linkedin.com/in/foo')).toBe(true)
  })

  it('accepts /pub/ URLs', () => {
    expect(isLinkedInProfileUrl('https://www.linkedin.com/pub/foo/bar')).toBe(true)
  })

  it('rejects http', () => {
    expect(isLinkedInProfileUrl('http://www.linkedin.com/in/foo')).toBe(false)
  })

  it('rejects non-LinkedIn hosts', () => {
    expect(isLinkedInProfileUrl('https://example.com/in/foo')).toBe(false)
  })

  it('rejects LinkedIn non-profile paths', () => {
    expect(isLinkedInProfileUrl('https://www.linkedin.com/company/foo')).toBe(false)
  })

  it('rejects empty or invalid', () => {
    expect(isLinkedInProfileUrl('')).toBe(false)
    expect(isLinkedInProfileUrl('not-a-url')).toBe(false)
  })
})

describe('isJobSeekerProfileComplete', () => {
  it('returns false for null row', () => {
    expect(isJobSeekerProfileComplete(null)).toBe(false)
  })

  it('returns false when phone or linkedin missing', () => {
    expect(
      isJobSeekerProfileComplete({
        linkedin_url: 'https://www.linkedin.com/in/x',
        phone: null,
      })
    ).toBe(false)
    expect(
      isJobSeekerProfileComplete({
        linkedin_url: null,
        phone: '+1 555 123 4567',
      })
    ).toBe(false)
  })

  it('returns true when both valid', () => {
    expect(
      isJobSeekerProfileComplete({
        linkedin_url: 'https://www.linkedin.com/in/x',
        phone: '+1 555 123 4567',
      })
    ).toBe(true)
  })
})
