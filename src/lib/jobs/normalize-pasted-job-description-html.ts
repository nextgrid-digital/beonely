/**
 * Converts rich paste HTML (web, Notion, Google Docs, Word) into the subset
 * supported by the job description editor before DOMPurify runs.
 */

/** MS Word / browser clipboards often wrap content in fragment comments. */
export function extractClipboardHtmlFragment(html: string): string {
  const match =
    /<!--StartFragment-->([\s\S]*?)<!--EndFragment-->/i.exec(html) ??
    /<!--startfragment-->([\s\S]*?)<!--endfragment-->/i.exec(html)
  return match ? match[1].trim() : html.trim()
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** When the clipboard has only plain text, preserve paragraph breaks for TipTap. */
export function plainTextJobPasteToHtml(text: string): string {
  const t = text.replace(/\r\n/g, '\n')
  const paras = t
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
  if (paras.length === 0) return '<p></p>'
  return paras
    .map((p) => {
      const inner = escapeHtml(p).replace(/\n/g, '<br />')
      return `<p>${inner}</p>`
    })
    .join('')
}

function styleHasBold(style: string): boolean {
  const m = /font-weight\s*:\s*([^;]+)/i.exec(style)
  if (!m) return false
  const v = m[1].trim().toLowerCase()
  if (v === 'bold' || v === 'bolder') return true
  const n = Number.parseInt(v, 10)
  return !Number.isNaN(n) && n >= 600
}

function styleHasItalic(style: string): boolean {
  return /font-style\s*:\s*(italic|oblique)/i.test(style)
}

function styleHasUnderline(style: string): boolean {
  return /text-decoration(?:-line)?\s*:\s*[^;]*underline/i.test(style)
}

function classSuggestsBold(className: string): boolean {
  const c = className.toLowerCase()
  return (
    /\b(font-)?(bold|semibold|extrabold|black)\b/.test(c) ||
    /\bfw-?\s*[:_]?\s*(bold|semibold|700|600)\b/.test(c) ||
    /\bfont-weight-(bold|semibold|extrabold)\b/.test(c)
  )
}

function classSuggestsItalic(className: string): boolean {
  const c = className.toLowerCase()
  return /\bitalic\b/.test(c) || /\bfont-style-italic\b/.test(c)
}

function classSuggestsUnderline(className: string): boolean {
  return /\bunderline\b/.test(className.toLowerCase())
}

function replaceTag(el: Element, newTag: string, doc: Document): void {
  const next = doc.createElement(newTag)
  while (el.firstChild) next.appendChild(el.firstChild)
  el.parentNode?.replaceChild(next, el)
}

function processSpan(span: HTMLSpanElement, doc: Document): void {
  const style = span.getAttribute('style') || ''
  const cls = span.getAttribute('class') || ''
  const bold = styleHasBold(style) || classSuggestsBold(cls)
  const italic = styleHasItalic(style) || classSuggestsItalic(cls)
  const underline = styleHasUnderline(style) || classSuggestsUnderline(cls)

  const parent = span.parentNode
  if (!parent) return

  if (!bold && !italic && !underline) {
    while (span.firstChild) parent.insertBefore(span.firstChild, span)
    parent.removeChild(span)
    return
  }

  const frag = doc.createDocumentFragment()
  while (span.firstChild) frag.appendChild(span.firstChild)

  let wrapped: Node = frag
  const wrap = (tag: string) => {
    const el = doc.createElement(tag)
    el.appendChild(wrapped)
    wrapped = el
  }
  if (underline) wrap('u')
  if (italic) wrap('em')
  if (bold) wrap('strong')

  parent.replaceChild(wrapped, span)
}

function stripUnsafe(body: HTMLElement): void {
  body
    .querySelectorAll(
      'script,style,iframe,noscript,object,embed,img,svg,figure,video,audio'
    )
    .forEach((el) => el.remove())
}

function normalizeHeadings(body: HTMLElement, doc: Document): void {
  body.querySelectorAll('h1').forEach((h) => replaceTag(h, 'h2', doc))
  body.querySelectorAll('h4,h5,h6').forEach((h) => replaceTag(h, 'h3', doc))
}

function normalizeBiTags(body: HTMLElement, doc: Document): void {
  body.querySelectorAll('b').forEach((b) => replaceTag(b, 'strong', doc))
  body.querySelectorAll('i').forEach((i) => replaceTag(i, 'em', doc))
}

function flattenTables(body: HTMLElement, doc: Document): void {
  body.querySelectorAll('table').forEach((table) => {
    const fragment = doc.createDocumentFragment()
    for (const row of table.querySelectorAll('tr')) {
      const texts: string[] = []
      for (const cell of row.querySelectorAll('th, td')) {
        const text = (cell.textContent ?? '').trim()
        if (text) texts.push(text)
      }
      if (texts.length === 0) continue
      const p = doc.createElement('p')
      p.textContent = texts.join(' · ')
      fragment.appendChild(p)
    }
    if (!fragment.childNodes.length) {
      table.remove()
      return
    }
    table.replaceWith(fragment)
  })
}

function depth(el: Element): number {
  let d = 0
  let n: Element | null = el
  while (n) {
    d += 1
    n = n.parentElement
  }
  return d
}

function flattenDivs(body: HTMLElement, doc: Document): void {
  const divs = Array.from(body.querySelectorAll('div')).sort(
    (a, b) => depth(b) - depth(a)
  )
  for (const div of divs) {
    if (!body.contains(div)) continue

    if (div.closest('ul,ol')) {
      const li = div.closest('li')
      if (li && div.parentNode === li) {
        while (div.firstChild) li.insertBefore(div.firstChild, div)
        div.remove()
      }
      continue
    }

    const onlyEl = div.children.length === 1 ? div.firstElementChild : null
    if (onlyEl?.tagName === 'P') {
      div.parentNode?.replaceChild(onlyEl, div)
      continue
    }
    if (onlyEl && (onlyEl.tagName === 'UL' || onlyEl.tagName === 'OL')) {
      div.parentNode?.replaceChild(onlyEl, div)
      continue
    }

    const p = doc.createElement('p')
    while (div.firstChild) p.appendChild(div.firstChild)
    div.parentNode?.replaceChild(p, div)
  }
}

function unwrapUnknownBlockTags(body: HTMLElement): void {
  const allowed = new Set([
    'P',
    'BR',
    'STRONG',
    'B',
    'EM',
    'I',
    'U',
    'UL',
    'OL',
    'LI',
    'A',
    'H2',
    'H3',
    'BLOCKQUOTE',
    'BODY',
    'HTML',
  ])
  const candidates = Array.from(body.querySelectorAll('*')).sort(
    (a, b) => depth(b) - depth(a)
  )
  for (const el of candidates) {
    if (!body.contains(el)) continue
    if (allowed.has(el.tagName)) continue
    const parent = el.parentNode
    if (!parent) continue
    while (el.firstChild) parent.insertBefore(el.firstChild, el)
    parent.removeChild(el)
  }
}

export function normalizePastedJobDescriptionHtml(html: string): string {
  const trimmed = extractClipboardHtmlFragment(html)
  if (!trimmed) return ''

  if (typeof document === 'undefined') {
    return trimmed
  }

  const parsed = new DOMParser().parseFromString(trimmed, 'text/html')
  const body = parsed.body
  stripUnsafe(body)
  flattenTables(body, parsed)
  normalizeHeadings(body, parsed)

  let guard = 0
  while (body.querySelector('span,font') && guard < 500) {
    const spans = Array.from(body.querySelectorAll('span,font'))
    if (spans.length === 0) break
    spans.sort((a, b) => depth(b) - depth(a))
    for (const span of spans) {
      const tag = span.tagName
      if (tag === 'SPAN') processSpan(span as HTMLSpanElement, parsed)
      else if (tag === 'FONT') {
        const parent = span.parentNode
        if (!parent) continue
        while (span.firstChild) parent.insertBefore(span.firstChild, span)
        parent.removeChild(span)
      }
    }
    guard += 1
  }

  normalizeBiTags(body, parsed)
  flattenDivs(body, parsed)
  unwrapUnknownBlockTags(body)

  body.querySelectorAll('p').forEach((p) => {
    if (p.textContent?.trim() === '' && !p.querySelector('br')) p.remove()
  })

  return body.innerHTML.trim()
}
