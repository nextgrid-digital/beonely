import { describe, expect, it } from 'vitest'
import {
  adminNavItems,
  getActiveAdminNavItem,
  isAdminNavItemActive,
} from './admin-nav'

describe('admin navigation matching', () => {
  it('keeps dashboard and email overview exact', () => {
    expect(
      isAdminNavItemActive('/admin/jobs', {
        href: '/admin',
        match: 'exact',
      })
    ).toBe(false)
    expect(
      isAdminNavItemActive('/admin/email/automations', {
        href: '/admin/email',
        match: 'exact',
      })
    ).toBe(false)
  })

  it('matches descendants without matching similar path segments', () => {
    expect(
      isAdminNavItemActive('/admin/jobs/123', { href: '/admin/jobs' })
    ).toBe(true)
    expect(
      isAdminNavItemActive('/admin/jobs-archive', { href: '/admin/jobs' })
    ).toBe(false)
  })

  it('normalizes trailing slashes and returns the deepest active item', () => {
    expect(getActiveAdminNavItem('/admin/email/templates/abc/')?.title).toBe(
      'Templates'
    )
  })

  it('contains no duplicate destinations', () => {
    const hrefs = adminNavItems.map((item) => item.href)
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })
})
