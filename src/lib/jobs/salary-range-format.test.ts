import { describe, expect, it } from 'vitest'
import {
  formatSalaryRange,
  parseSalaryRange,
} from '@/lib/jobs/salary-range-format'

describe('parseSalaryRange', () => {
  it('parses coded format', () => {
    expect(parseSalaryRange('INR · 12-24 LPA')).toEqual({
      currency: 'INR',
      amount: '12-24 LPA',
    })
    expect(parseSalaryRange('USD · 120k–140k')).toEqual({
      currency: 'USD',
      amount: '120k–140k',
    })
  })

  it('parses legacy symbol prefix', () => {
    expect(parseSalaryRange('₹18–24 LPA').currency).toBe('INR')
    expect(parseSalaryRange('$120k').currency).toBe('USD')
  })

  it('defaults empty to INR', () => {
    expect(parseSalaryRange(null)).toEqual({ currency: 'INR', amount: '' })
  })
})

describe('formatSalaryRange', () => {
  it('combines currency and amount', () => {
    expect(formatSalaryRange('INR', '12-24 LPA')).toBe('INR · 12-24 LPA')
    expect(formatSalaryRange('USD', '120k')).toBe('USD · 120k')
  })

  it('returns null when amount empty', () => {
    expect(formatSalaryRange('INR', '')).toBeNull()
    expect(formatSalaryRange('INR', '   ')).toBeNull()
  })
})
