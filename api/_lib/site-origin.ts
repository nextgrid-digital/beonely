const DEFAULT_SITE_ORIGIN = 'https://beonely.vercel.app'

export function serverSiteOrigin (): string {
  const raw = process.env.VITE_PUBLIC_SITE_URL?.trim()
  if (raw) return raw.replace(/\/$/, '')
  return DEFAULT_SITE_ORIGIN
}
