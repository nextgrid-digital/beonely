/** Public portfolio handle rules for `beonely.in/p/{handle}`. */

export const PORTFOLIO_HANDLE_MIN = 3
export const PORTFOLIO_HANDLE_MAX = 40

/** 3-40 chars, lowercase alphanumeric + internal hyphens (no leading/trailing hyphen). */
export const PORTFOLIO_HANDLE_RE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/

/** Reserved so handles cannot shadow real routes or look official. */
const RESERVED_HANDLES = new Set([
  'p',
  'api',
  'app',
  'jobs',
  'hire',
  'admin',
  'candidate',
  'recruiter',
  'settings',
  'auth',
  'sign-in',
  'sign-up',
  'reset-password',
  'privacy',
  'terms',
  'changelog',
  'unsubscribe',
  'about',
  'contact',
  'blog',
  'help',
  'support',
  'www',
  'beonely',
])

/** Build a candidate handle from a display name. May be shorter than the min. */
export function slugifyHandle(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, PORTFOLIO_HANDLE_MAX)
    .replace(/-+$/g, '')
}

export function isReservedHandle(handle: string): boolean {
  return RESERVED_HANDLES.has(handle.trim().toLowerCase())
}

export function isValidHandle(handle: string): boolean {
  return PORTFOLIO_HANDLE_RE.test(handle)
}

/** Returns a human-readable error, or null when the handle is well-formed and allowed. */
export function validateHandle(handle: string): string | null {
  const value = handle.trim()
  if (value.length < PORTFOLIO_HANDLE_MIN) {
    return `Use at least ${PORTFOLIO_HANDLE_MIN} characters.`
  }
  if (value.length > PORTFOLIO_HANDLE_MAX) {
    return `Use at most ${PORTFOLIO_HANDLE_MAX} characters.`
  }
  if (!isValidHandle(value)) {
    return 'Use lowercase letters, numbers, and hyphens only.'
  }
  if (isReservedHandle(value)) {
    return 'That handle is reserved. Try another.'
  }
  return null
}
