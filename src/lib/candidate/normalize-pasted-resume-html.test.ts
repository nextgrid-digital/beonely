import { describe, expect, it } from 'vitest'
import {
  normalizePastedResumeHtml,
  plainTextResumePasteToHtml,
} from '@/lib/candidate/normalize-pasted-resume-html'

describe('plainTextResumePasteToHtml', () => {
  it('splits blank lines into paragraphs', () => {
    const out = plainTextResumePasteToHtml('First block\n\nSecond block')
    expect(out).toContain('<p>')
    expect(out).toContain('First block')
    expect(out).toContain('Second block')
    expect(out.match(/<p>/g)?.length).toBe(2)
  })

  it('turns single newlines into br inside a paragraph', () => {
    const out = plainTextResumePasteToHtml('Line one\nLine two')
    expect(out).toContain('<br />')
    expect(out).toContain('Line one')
    expect(out).toContain('Line two')
  })

  it('escapes HTML in plain text', () => {
    const out = plainTextResumePasteToHtml('<script>x</script>')
    expect(out).not.toContain('<script>')
    expect(out).toContain('&lt;script&gt;')
  })
})

describe('normalizePastedResumeHtml', () => {
  it('maps font-weight span to strong', () => {
    const out = normalizePastedResumeHtml(
      '<p><span style="font-weight: 700">Bold</span> text</p>'
    )
    expect(out).toContain('<strong>')
    expect(out).toContain('Bold')
  })

  it('maps italic style span to em', () => {
    const out = normalizePastedResumeHtml('<p><span style="font-style: italic">Hi</span></p>')
    expect(out).toContain('<em>')
    expect(out).toContain('Hi')
  })

  it('preserves nested list structure from wrapped div', () => {
    const out = normalizePastedResumeHtml('<div><ul><li>One</li><li>Two</li></ul></div>')
    expect(out).toContain('<ul>')
    expect(out).toContain('<li>')
    expect(out).toContain('One')
    expect(out).toContain('Two')
  })

  it('maps underline style span to u', () => {
    const out = normalizePastedResumeHtml(
      '<p><span style="text-decoration: underline">Under</span></p>'
    )
    expect(out).toContain('<u>')
    expect(out).toContain('Under')
  })

  it('maps heading to paragraph', () => {
    const out = normalizePastedResumeHtml('<h2>Title</h2>')
    expect(out).toContain('<p>')
    expect(out).toContain('Title')
    expect(out.toLowerCase()).not.toContain('<h2')
  })
})
