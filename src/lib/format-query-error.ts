/**
 * Human-readable message for values React Query stores as `query.error`
 * (Error, PostgREST-style objects, strings, or unknown).
 */
export function formatQueryError(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string' && error.trim()) return error
  if (typeof error === 'object' && error !== null) {
    const o = error as Record<string, unknown>
    const msg = typeof o.message === 'string' ? o.message.trim() : ''
    const code = typeof o.code === 'string' ? o.code.trim() : ''
    const hint = typeof o.hint === 'string' ? o.hint.trim() : ''
    const details = typeof o.details === 'string' ? o.details.trim() : ''
    const parts = [msg || null, code ? `(code ${code})` : null].filter(Boolean)
    if (parts.length) return parts.join(' ')
    if (hint) return hint
    if (details) return details
  }
  return fallback
}
