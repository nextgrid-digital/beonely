import { afterEach, describe, expect, it } from 'vitest'
import {
  getAdminAllowlistFromServerEnv,
  isAllowlistedAdminEmail,
} from './admin-access.js'

const originalServerAllowlist = process.env.ADMIN_EMAIL_ALLOWLIST
const originalBrowserAllowlist = process.env.VITE_ADMIN_EMAIL_ALLOWLIST

afterEach(() => {
  if (originalServerAllowlist === undefined) {
    delete process.env.ADMIN_EMAIL_ALLOWLIST
  } else {
    process.env.ADMIN_EMAIL_ALLOWLIST = originalServerAllowlist
  }
  if (originalBrowserAllowlist === undefined) {
    delete process.env.VITE_ADMIN_EMAIL_ALLOWLIST
  } else {
    process.env.VITE_ADMIN_EMAIL_ALLOWLIST = originalBrowserAllowlist
  }
})

describe('server admin allowlist', () => {
  it('fails closed when only the browser allowlist is configured', () => {
    delete process.env.ADMIN_EMAIL_ALLOWLIST
    process.env.VITE_ADMIN_EMAIL_ALLOWLIST = 'admin@example.com'

    expect(getAdminAllowlistFromServerEnv()).toEqual([])
    expect(isAllowlistedAdminEmail('admin@example.com')).toBe(false)
  })

  it('normalizes the authoritative server allowlist', () => {
    process.env.ADMIN_EMAIL_ALLOWLIST =
      ' Admin@Example.com, ops@example.com '

    expect(getAdminAllowlistFromServerEnv()).toEqual([
      'admin@example.com',
      'ops@example.com',
    ])
  })
})
