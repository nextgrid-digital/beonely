/** Return a canonical HTTPS URL suitable for an untrusted rendered link. */
export function safeHttpsUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  if (!trimmed || trimmed.length > 2048) return null
  try {
    const url = new URL(trimmed)
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      !url.hostname
    ) {
      return null
    }
    return url.toString()
  } catch {
    return null
  }
}

/**
 * Links supported in a private resume preview. Public portfolio data removes
 * mail and phone contacts server-side before it reaches this renderer.
 */
export function safeResumeContactHref(
  value: string | null | undefined
): string | null {
  const https = safeHttpsUrl(value)
  if (https) return https
  const trimmed = value?.trim() ?? ''
  if (/^mailto:[^\s@]+@[^\s@]+$/i.test(trimmed)) return trimmed
  if (/^tel:\+?[0-9 ().-]{7,30}$/i.test(trimmed)) return trimmed
  return null
}
