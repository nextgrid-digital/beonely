/** True when URL is https and points at a LinkedIn profile path we accept. */
export function isLinkedInProfileUrl(raw: string): boolean {
  const t = raw.trim()
  if (!t) return false
  let url: URL
  try {
    url = new URL(t)
  } catch {
    return false
  }
  if (url.protocol !== 'https:') return false
  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  if (host !== 'linkedin.com') return false
  const path = url.pathname.toLowerCase()
  return path.startsWith('/in/') || path.startsWith('/pub/')
}
