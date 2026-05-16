import { describe, expect, it } from 'vitest'
import {
  getAdminAllowlistFromEnv,
  isAllowlistedAdminEmail,
  parseAdminAllowlist,
} from './admin-access'

describe('parseAdminAllowlist', () => {
  it('parses comma-separated emails trimmed and lowercased', () => {
    expect(parseAdminAllowlist('  Ops@Company.com , admin@beonely.com ')).toEqual(
      ['ops@company.com', 'admin@beonely.com']
    )
  })

  it('returns empty array for blank input', () => {
    expect(parseAdminAllowlist('')).toEqual([])
    expect(parseAdminAllowlist(undefined)).toEqual([])
  })
})

describe('isAllowlistedAdminEmail', () => {
  it('matches case-insensitively against explicit allowlist', () => {
    const list = ['ops@company.com']
    expect(isAllowlistedAdminEmail('Ops@Company.com', list)).toBe(true)
    expect(isAllowlistedAdminEmail('other@company.com', list)).toBe(false)
  })

  it('fails closed when allowlist is empty', () => {
    expect(isAllowlistedAdminEmail('ops@company.com', [])).toBe(false)
  })
})

describe('getAdminAllowlistFromEnv', () => {
  it('reads VITE_ADMIN_EMAIL_ALLOWLIST from import.meta.env', () => {
    expect(getAdminAllowlistFromEnv()).toEqual(
      parseAdminAllowlist(import.meta.env.VITE_ADMIN_EMAIL_ALLOWLIST)
    )
  })
})
