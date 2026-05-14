import { describe, expect, it } from 'vitest'
import { sanitizeProfileReturnTo } from '@/lib/candidate/sanitize-return-to'

describe('sanitizeProfileReturnTo', () => {
  it('returns null for empty or non-string', () => {
    expect(sanitizeProfileReturnTo(undefined)).toBeNull()
    expect(sanitizeProfileReturnTo('')).toBeNull()
    expect(sanitizeProfileReturnTo('   ')).toBeNull()
    expect(sanitizeProfileReturnTo(null as unknown as string)).toBeNull()
  })

  it('rejects protocol-relative and non-root paths', () => {
    expect(sanitizeProfileReturnTo('//evil.com/phish')).toBeNull()
    expect(sanitizeProfileReturnTo('https://evil.com/jobs/x')).toBeNull()
    expect(sanitizeProfileReturnTo('jobs/foo')).toBeNull()
  })

  it('rejects path traversal', () => {
    expect(sanitizeProfileReturnTo('/jobs/../admin')).toBeNull()
    expect(sanitizeProfileReturnTo('/foo..bar')).toBeNull()
  })

  it('allows root', () => {
    expect(sanitizeProfileReturnTo('/')).toBe('/')
  })

  it('allows single-segment job detail slug', () => {
    expect(sanitizeProfileReturnTo('/jobs/acme-engineer')).toBe(
      '/jobs/acme-engineer'
    )
    expect(sanitizeProfileReturnTo('  /jobs/my-role-123  ')).toBe(
      '/jobs/my-role-123'
    )
  })

  it('rejects job paths with extra segments', () => {
    expect(sanitizeProfileReturnTo('/jobs/foo/edit')).toBeNull()
    expect(sanitizeProfileReturnTo('/jobs/')).toBeNull()
  })
})
