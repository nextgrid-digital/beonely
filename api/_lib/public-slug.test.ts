import { describe, expect, it } from 'vitest'
import { isValidJobSlug, isValidPortfolioSlug } from './public-slug.js'

describe('public slug validation', () => {
  it('accepts normal application slugs', () => {
    expect(isValidJobSlug('senior-servicenow-developer-delhi-a1b2c3d4')).toBe(
      true
    )
    expect(isValidPortfolioSlug('alok-kumar')).toBe(true)
  })

  it('rejects traversal, markup, malformed separators, and oversized input', () => {
    for (const value of [
      '../secret',
      '<script>',
      '-leading',
      'trailing-',
      'a--/b',
    ]) {
      expect(isValidJobSlug(value)).toBe(false)
      expect(isValidPortfolioSlug(value)).toBe(false)
    }
    expect(isValidJobSlug('a'.repeat(121))).toBe(false)
    expect(isValidPortfolioSlug('ab')).toBe(false)
    expect(isValidPortfolioSlug('a'.repeat(41))).toBe(false)
  })
})
