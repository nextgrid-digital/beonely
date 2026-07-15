const DEFAULT_SITE_ORIGIN = 'https://beonely.in'

export function serverSiteOrigin(): string {
  const raw = process.env.VITE_PUBLIC_SITE_URL?.trim()
  if (raw) {
    try {
      const parsed = new URL(raw)
      const localDevelopment =
        parsed.protocol === 'http:' &&
        (parsed.hostname === 'localhost' ||
          parsed.hostname === '127.0.0.1' ||
          parsed.hostname === '[::1]')
      if (parsed.protocol === 'https:' || localDevelopment) {
        return parsed.origin
      }
    } catch {
      // Fall through to the known-safe production default.
    }
  }
  return DEFAULT_SITE_ORIGIN
}
