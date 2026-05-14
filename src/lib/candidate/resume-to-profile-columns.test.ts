import { describe, expect, it } from 'vitest'
import { deriveProfileColumnsFromResume } from '@/lib/candidate/resume-to-profile-columns'
import { defaultResumeStructured } from '@/lib/candidate/resume-structured-schema'

describe('deriveProfileColumnsFromResume', () => {
  it('maps name and valid portfolio website', () => {
    const draft = defaultResumeStructured()
    draft.general.name = 'Jane Doe'
    draft.general.website = 'https://jane.dev'
    draft.general.contacts = [{ label: 'Email', value: 'j@x.com', href: 'mailto:j@x.com' }]
    const r = deriveProfileColumnsFromResume(draft, null)
    expect(r.full_name).toBe('Jane Doe')
    expect(r.portfolio_url).toBe('https://jane.dev')
  })

  it('sets portfolio_url null when website invalid', () => {
    const draft = defaultResumeStructured()
    draft.general.website = 'not-a-url'
    const r = deriveProfileColumnsFromResume(draft, null)
    expect(r.portfolio_url).toBeNull()
  })

  it('extracts LinkedIn and phone from contacts', () => {
    const draft = defaultResumeStructured()
    draft.general.contacts = [
      { label: 'LinkedIn', value: 'me', href: 'https://www.linkedin.com/in/me/' },
      { label: 'Phone', value: '+1 555 123 4567', href: 'tel:+15551234567' },
    ]
    const r = deriveProfileColumnsFromResume(draft, null)
    expect(r.linkedin_url).toBe('https://www.linkedin.com/in/me/')
    expect(r.phone).toBe('+15551234567')
  })

  it('preserves sign-up linkedin and phone when missing from contacts', () => {
    const draft = defaultResumeStructured()
    draft.general.contacts = []
    const r = deriveProfileColumnsFromResume(draft, {
      linkedin_url: 'https://linkedin.com/in/saved/',
      phone: '+91 99999 99999',
    })
    expect(r.linkedin_url).toBe('https://linkedin.com/in/saved/')
    expect(r.phone).toBe('+91 99999 99999')
  })
})
