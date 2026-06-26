import { describe, expect, it } from 'vitest'
import {
  isReservedHandle,
  isValidHandle,
  slugifyHandle,
  validateHandle,
} from './portfolio-slug'

describe('portfolio-slug', () => {
  it('slugifies a display name', () => {
    expect(slugifyHandle('Jane Doe')).toBe('jane-doe')
    expect(slugifyHandle('  José  Núñez!! ')).toBe('jos-n-ez')
    expect(slugifyHandle('A')).toBe('a')
  })

  it('validates well-formed handles', () => {
    expect(isValidHandle('jane-doe')).toBe(true)
    expect(isValidHandle('jane')).toBe(true)
    expect(isValidHandle('a1b2c3')).toBe(true)
  })

  it('rejects malformed handles', () => {
    expect(isValidHandle('ab')).toBe(false) // too short
    expect(isValidHandle('-jane')).toBe(false) // leading hyphen
    expect(isValidHandle('jane-')).toBe(false) // trailing hyphen
    expect(isValidHandle('Jane')).toBe(false) // uppercase
    expect(isValidHandle('jane doe')).toBe(false) // space
  })

  it('flags reserved handles', () => {
    expect(isReservedHandle('admin')).toBe(true)
    expect(isReservedHandle('JOBS')).toBe(true)
    expect(isReservedHandle('jane')).toBe(false)
  })

  it('returns a human-readable error or null', () => {
    expect(validateHandle('ab')).toMatch(/at least/i)
    expect(validateHandle('Jane')).toMatch(/lowercase/i)
    expect(validateHandle('admin')).toMatch(/reserved/i)
    expect(validateHandle('jane-doe')).toBeNull()
  })
})
