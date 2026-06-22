/**
 * Canonical public origin for the app (e.g. `https://beonely.in`).
 *
 * Prefers `VITE_PUBLIC_SITE_URL` so links and auth redirects always point at the
 * canonical domain, regardless of which host the app is currently served from
 * (apex, `www`, or a `*.vercel.app` deployment alias). Falls back to the current
 * browser origin, then to an empty string during SSR.
 */
export function publicSiteOrigin(): string {
  const fromEnv = import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined
  if (fromEnv?.trim()) return fromEnv.trim().replace(/\/$/, '')
  if (typeof window !== 'undefined') return window.location.origin
  return ''
}
