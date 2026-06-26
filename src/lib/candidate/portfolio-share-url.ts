import { publicSiteOrigin } from '@/lib/site/site-origin'

export { publicSiteOrigin }

export function publicPortfolioUrl (handle: string): string {
  const origin = publicSiteOrigin()
  const path = `/p/${encodeURIComponent(handle)}`
  return origin ? `${origin}${path}` : path
}

export function portfolioOgImageUrl (handle: string): string {
  const origin = publicSiteOrigin()
  const query = `slug=${encodeURIComponent(handle)}`
  return origin ? `${origin}/api/og/portfolio?${query}` : `/api/og/portfolio?${query}`
}

export function portfolioShareTitle (input: {
  name: string
  headline?: string | null
}): string {
  const headline = input.headline?.trim()
  return headline ? `${input.name} · ${headline}` : `${input.name} · Beonely`
}

export function portfolioShareMessage (input: {
  name: string
  headline?: string | null
  handle: string
}): string {
  const url = publicPortfolioUrl(input.handle)
  const headline = input.headline?.trim()
  const parts = [
    headline ? `${input.name} — ${headline}` : input.name,
    url,
  ].filter(Boolean)
  return parts.join('\n')
}
