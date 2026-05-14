import { describe, expect, it } from 'vitest'
import {
  contentFromJobDescriptionRichValue,
  looksLikeJobHtml,
  plainTextFromJobDescription,
  sanitizeJobDescriptionHtml,
} from '@/lib/jobs/sanitize-job-description-html'

describe('sanitizeJobDescriptionHtml', () => {
  it('allows headings, blockquote, lists, and links', () => {
    const input =
      '<h2>Role</h2><p>Hello <strong>world</strong></p><blockquote>Note</blockquote><ul><li>One</li></ul><p><a href="https://x.com" rel="noopener" target="_blank">x</a></p>'
    const out = sanitizeJobDescriptionHtml(input)
    expect(out).toContain('<h2>')
    expect(out).toContain('<blockquote>')
    expect(out).toContain('<ul>')
    expect(out).toContain('href="https://x.com"')
  })

  it('strips script and disallowed tags', () => {
    const input =
      '<p>Hi</p><script>alert(1)</script><img src=x onerror=alert(1) /><h2 onclick="bad">t</h2>'
    const out = sanitizeJobDescriptionHtml(input)
    expect(out).not.toContain('script')
    expect(out).not.toContain('<img')
    expect(out).not.toContain('onclick')
  })
})

describe('looksLikeJobHtml', () => {
  it('returns false for plain text', () => {
    expect(looksLikeJobHtml('Line one\nLine two')).toBe(false)
  })

  it('returns true for job-like HTML including headings', () => {
    expect(looksLikeJobHtml('<p>Hello</p>')).toBe(true)
    expect(looksLikeJobHtml('<h2>Section</h2>')).toBe(true)
    expect(looksLikeJobHtml('<blockquote>Quote</blockquote>')).toBe(true)
  })
})

describe('plainTextFromJobDescription', () => {
  it('collapses whitespace for plain text', () => {
    expect(plainTextFromJobDescription('  a  \n  b  ')).toBe('a b')
  })

  it('strips tags and keeps text for HTML', () => {
    expect(
      plainTextFromJobDescription(
        '<h2>Title</h2><p>Body <strong>bold</strong></p>'
      )
    ).toBe('Title Body bold')
  })
})

describe('contentFromJobDescriptionRichValue', () => {
  it('returns empty paragraph for blank', () => {
    expect(contentFromJobDescriptionRichValue('')).toBe('<p></p>')
  })

  it('wraps plain text as HTML', () => {
    expect(contentFromJobDescriptionRichValue('Hi')).toContain('Hi')
    expect(contentFromJobDescriptionRichValue('Hi')).toContain('<p>')
  })
})
