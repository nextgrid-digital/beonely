export function sanitizeRedirectPath(
  redirect: string | undefined | null
): string | undefined {
  if (!redirect || !redirect.startsWith('/')) return undefined
  return redirect
}

export function currentPathWithSearch(): string | undefined {
  if (typeof window === 'undefined') return undefined
  return `${window.location.pathname}${window.location.search}`
}

export function sameOriginReferrerPath(): string | undefined {
  if (typeof window === 'undefined' || !document.referrer) return undefined

  try {
    const referrer = new URL(document.referrer)
    if (referrer.origin !== window.location.origin) return undefined
    return `${referrer.pathname}${referrer.search}`
  } catch {
    return undefined
  }
}
