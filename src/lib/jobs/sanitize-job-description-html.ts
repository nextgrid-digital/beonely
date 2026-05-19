import DOMPurify from 'dompurify'
import { normalizePastedJobDescriptionHtml } from '@/lib/jobs/normalize-pasted-job-description-html'

type PurifyConfig = NonNullable<Parameters<typeof DOMPurify.sanitize>[1]>

const JOB_DESCRIPTION_HTML_PURIFY: PurifyConfig = {
  ALLOWED_TAGS: [
    'p',
    'br',
    'strong',
    'b',
    'em',
    'i',
    'u',
    'ul',
    'ol',
    'li',
    'a',
    'h2',
    'h3',
    'blockquote',
  ],
  ALLOWED_ATTR: ['href', 'rel', 'target'],
  ALLOW_DATA_ATTR: false,
}

/**
 * Sanitize HTML stored in `jobs.job_description` before save and before `dangerouslySetInnerHTML`.
 */
export function sanitizeJobDescriptionHtml(dirty: string): string {
  const trimmed = dirty.trim()
  if (!trimmed) return ''
  return String(DOMPurify.sanitize(trimmed, JOB_DESCRIPTION_HTML_PURIFY))
}

/** Normalize rich paste HTML, then sanitize for the job description editor. */
export function preparePastedJobDescriptionHtml(html: string): string {
  return sanitizeJobDescriptionHtml(normalizePastedJobDescriptionHtml(html))
}

/** Heuristic: legacy plain text vs HTML from the rich editor. */
export function looksLikeJobHtml(value: string): boolean {
  const t = value.trim()
  if (!t.includes('<')) return false
  return /<\/?(p|div|br|ul|ol|li|strong|em|b|i|u|a|h2|h3|blockquote)\b/i.test(t)
}

function plainTextToInitialHtml(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  if (!escaped) return '<p></p>'
  return `<p>${escaped.split('\n').join('<br />')}</p>`
}

/** Editor initial content: empty paragraph, sanitized HTML, or escaped plain text as HTML. */
export function contentFromJobDescriptionRichValue(value: string): string {
  const t = value.trim()
  if (!t) return '<p></p>'
  if (looksLikeJobHtml(t)) return sanitizeJobDescriptionHtml(t)
  return plainTextToInitialHtml(t)
}

/**
 * Plain text for excerpts, JSON-LD, and validation. Prefer DOM textContent when available.
 */
export function plainTextFromJobDescription(html: string): string {
  const t = html.trim()
  if (!t) return ''
  if (!looksLikeJobHtml(t)) {
    return t.replace(/\s+/g, ' ').trim()
  }
  const safe = sanitizeJobDescriptionHtml(t)
  if (typeof document !== 'undefined') {
    const spaced = safe
      .replace(/<\/(h2|h3|blockquote)>/gi, '$& ')
      .replace(/<\/p>/gi, '$& ')
      .replace(/<\/li>/gi, '$& ')
      .replace(/<br\s*\/?>/gi, ' ')
    const d = document.createElement('div')
    d.innerHTML = spaced
    const raw = d.innerText ?? d.textContent ?? ''
    return raw.replace(/\s+/g, ' ').trim()
  }
  return safe
    .replace(/<\/(h2|h3|blockquote)>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<\/li>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
