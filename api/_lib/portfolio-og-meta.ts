import type { PublicPortfolio } from './public-portfolio.js'
import { truncateText } from './job-og-meta.js'
import { serverSiteOrigin } from './site-origin.js'

export function publicPortfolioPageUrl (slug: string): string {
  return `${serverSiteOrigin()}/p/${encodeURIComponent(slug)}`
}

export function portfolioOgImageApiUrl (slug: string): string {
  return `${serverSiteOrigin()}/api/og/portfolio?slug=${encodeURIComponent(slug)}`
}

export function portfolioOgTitle (portfolio: Pick<PublicPortfolio, 'name'>): string {
  return `${portfolio.name} · Beonely`
}

export function portfolioOgDescription (portfolio: PublicPortfolio): string {
  const headline = portfolio.headline.trim()
  const about = portfolio.about.trim()
  if (headline && about) return truncateText(`${headline} — ${about}`, 160)
  if (about) return truncateText(about, 160)
  if (headline) return truncateText(`${headline} · ServiceNow profile on Beonely`, 160)
  return truncateText(`${portfolio.name} · ServiceNow profile on Beonely`, 160)
}

function sectionMatches (title: string, needle: string): boolean {
  return title.trim().toLowerCase().includes(needle)
}

/** Up to `max` short chips: certificate names first, then skill bullets. */
export function portfolioOgChips (
  portfolio: PublicPortfolio,
  max = 3
): string[] {
  const chips: string[] = []

  const pushUnique = (raw: string) => {
    const value = raw.trim()
    if (!value) return
    if (chips.length >= max) return
    if (chips.some((c) => c.toLowerCase() === value.toLowerCase())) return
    chips.push(truncateText(value, 40))
  }

  for (const section of portfolio.resume.sections) {
    if (!sectionMatches(section.title, 'certificat')) continue
    for (const item of section.items) {
      const title = typeof item.title === 'string' ? item.title : ''
      pushUnique(title)
    }
  }

  if (chips.length < max) {
    for (const section of portfolio.resume.sections) {
      if (!sectionMatches(section.title, 'skill')) continue
      for (const item of section.items) {
        const desc = typeof item.description === 'string' ? item.description : ''
        for (const line of desc.split(/\r?\n/)) {
          pushUnique(line.replace(/^[•\-*\s]+/, ''))
        }
      }
    }
  }

  return chips
}
