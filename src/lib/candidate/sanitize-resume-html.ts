import DOMPurify from 'dompurify'
import type { ResumeStructuredV1 } from '@/lib/candidate/resume-structured-schema'

type PurifyConfig = NonNullable<Parameters<typeof DOMPurify.sanitize>[1]>

const RESUME_HTML_PURIFY: PurifyConfig = {
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
  ],
  ALLOWED_ATTR: ['href', 'rel', 'target'],
  ALLOW_DATA_ATTR: false,
}

/**
 * Sanitize HTML stored in `resume_structured` rich fields (`general.about`, item `description`).
 * Call before save and before `dangerouslySetInnerHTML`.
 */
export function sanitizeResumeHtml(dirty: string): string {
  const trimmed = dirty.trim()
  if (!trimmed) return ''
  return String(DOMPurify.sanitize(trimmed, RESUME_HTML_PURIFY))
}

/** Heuristic: legacy plain text vs HTML from the rich editor. */
export function looksLikeResumeHtml(value: string): boolean {
  const t = value.trim()
  if (!t.includes('<')) return false
  return /<\/?(p|div|br|ul|ol|li|strong|em|b|i|u|a)\b/i.test(t)
}

/** Sanitize rich HTML fields before persisting `resume_structured`. */
export function sanitizeResumeStructuredRichFields(
  draft: ResumeStructuredV1
): ResumeStructuredV1 {
  return {
    ...draft,
    general: {
      ...draft.general,
      about: sanitizeResumeHtml(draft.general.about),
    },
    sections: draft.sections.map((sec) => ({
      ...sec,
      items: sec.items.map((item) => ({
        ...item,
        description: sanitizeResumeHtml(item.description),
      })),
    })),
  }
}
