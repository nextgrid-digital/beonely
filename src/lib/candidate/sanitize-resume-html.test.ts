import { describe, expect, it } from 'vitest'
import { looksLikeResumeHtml, sanitizeResumeHtml } from '@/lib/candidate/sanitize-resume-html'

describe('sanitizeResumeHtml', () => {
  it('allows benign formatting tags', () => {
    const input = '<p>Hello <strong>world</strong></p><ul><li>One</li></ul>'
    expect(sanitizeResumeHtml(input)).toContain('<p>')
    expect(sanitizeResumeHtml(input)).toContain('<strong>')
    expect(sanitizeResumeHtml(input)).toContain('<ul>')
  })

  it('strips script and event handlers', () => {
    const input = '<p>Hi</p><script>alert(1)</script><p onclick="alert(2)">x</p>'
    const out = sanitizeResumeHtml(input)
    expect(out).not.toContain('script')
    expect(out).not.toContain('onclick')
  })
})

describe('looksLikeResumeHtml', () => {
  it('returns false for plain text', () => {
    expect(looksLikeResumeHtml('Line one\nLine two')).toBe(false)
  })

  it('returns true for simple HTML', () => {
    expect(looksLikeResumeHtml('<p>Hello</p>')).toBe(true)
    expect(looksLikeResumeHtml('  <ul><li>a</li></ul>')).toBe(true)
  })
})
