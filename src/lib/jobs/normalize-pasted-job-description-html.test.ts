// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { normalizePastedJobDescriptionHtml } from '@/lib/jobs/normalize-pasted-job-description-html'
import { preparePastedJobDescriptionHtml } from '@/lib/jobs/sanitize-job-description-html'

describe('normalizePastedJobDescriptionHtml', () => {
  it('converts Notion-style divs to paragraphs', () => {
    const input = '<div>Line one</div><div><br></div><div>Line two</div>'
    const out = normalizePastedJobDescriptionHtml(input)
    expect(out).toContain('<p>Line one</p>')
    expect(out).toContain('<p>Line two</p>')
  })

  it('maps styled spans to semantic bold and italic', () => {
    const input =
      '<p><span style="font-weight:600">Bold</span> and <span style="font-style:italic">italic</span></p>'
    const out = normalizePastedJobDescriptionHtml(input)
    expect(out).toContain('<strong>Bold</strong>')
    expect(out).toContain('<em>italic</em>')
  })

  it('maps h1 to h2', () => {
    const out = normalizePastedJobDescriptionHtml('<h1>Title</h1>')
    expect(out).toBe('<h2>Title</h2>')
  })

  it('preserves bullet lists', () => {
    const input = '<ul><li>First</li><li>Second</li></ul>'
    const out = preparePastedJobDescriptionHtml(input)
    expect(out).toContain('<ul>')
    expect(out).toContain('<li>First</li>')
  })

  it('maps Tailwind-style class spans to bold', () => {
    const input =
      '<p>Normal <span class="font-semibold">highlighted</span> text</p>'
    const out = normalizePastedJobDescriptionHtml(input)
    expect(out).toContain('<strong>highlighted</strong>')
  })

  it('extracts MS clipboard fragment comments', () => {
    const wrapped =
      '<html><body><!--StartFragment--><p><strong>Hi</strong></p><!--EndFragment--></body></html>'
    const out = preparePastedJobDescriptionHtml(wrapped)
    expect(out).toContain('<strong>Hi</strong>')
  })
})
