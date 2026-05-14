/**
 * Safe in-app paths allowed after profile completion (e.g. return from apply flow).
 */
export function sanitizeProfileReturnTo (raw: string | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null
  const t = raw.trim()
  if (!t.startsWith('/') || t.startsWith('//')) return null
  if (t.includes('..')) return null
  if (t === '/') return '/'
  if (/^\/jobs\/[^/]+$/.test(t)) return t
  return null
}
