import { describe, expect, it } from 'vitest'
import { getPostAuthPath } from '@/lib/auth/post-auth-path'
import type { ProfileRow } from '@/lib/supabase/database.types'

function profile(role: ProfileRow['role']): ProfileRow {
  return {
    id: 'p1',
    email: 'u@example.com',
    role,
    created_at: '',
    updated_at: '',
  }
}

describe('getPostAuthPath', () => {
  it('sends null profile to candidate profile', () => {
    expect(getPostAuthPath(null)).toBe('/candidate/profile')
  })

  it('sends candidate role to candidate profile', () => {
    expect(getPostAuthPath(profile('candidate'))).toBe('/candidate/profile')
  })

  it('sends recruiter to recruiter portal', () => {
    expect(getPostAuthPath(profile('recruiter'))).toBe('/recruiter')
  })

  it('sends admin to admin', () => {
    expect(getPostAuthPath(profile('admin'))).toBe('/admin')
  })
})
