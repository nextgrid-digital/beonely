import { describe, expect, it } from 'vitest'
import type { ProfileRow } from '@/lib/supabase/database.types'
import { filterProfilesForUrlState, isAdminRole } from './profile-filters'

const base = (overrides: Partial<ProfileRow>): ProfileRow => ({
  id: 'u1',
  email: 'alice@example.com',
  role: 'candidate',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

describe('filterProfilesForUrlState', () => {
  const rows: ProfileRow[] = [
    base({ id: '1', email: 'alice@example.com', role: 'candidate' }),
    base({ id: '2', email: 'bob@company.com', role: 'recruiter' }),
    base({ id: '3', email: 'admin@beonely.test', role: 'admin' }),
  ]

  it('returns all rows when filters empty', () => {
    expect(filterProfilesForUrlState(rows, {})).toEqual(rows)
  })

  it('filters by email substring case-insensitive', () => {
    expect(filterProfilesForUrlState(rows, { email: 'COMPANY' })).toEqual([
      rows[1],
    ])
  })

  it('filters by role list', () => {
    expect(
      filterProfilesForUrlState(rows, { role: ['admin', 'candidate'] })
    ).toEqual([rows[0], rows[2]])
  })

  it('combines email and role', () => {
    expect(
      filterProfilesForUrlState(rows, {
        email: 'admin',
        role: ['admin'],
      })
    ).toEqual([rows[2]])
  })
})

describe('isAdminRole', () => {
  it('is true only for admin', () => {
    expect(isAdminRole('admin')).toBe(true)
    expect(isAdminRole('recruiter')).toBe(false)
    expect(isAdminRole(undefined)).toBe(false)
  })
})
