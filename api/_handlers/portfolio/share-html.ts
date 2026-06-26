import type { VercelRequest, VercelResponse } from '@vercel/node'
import { fetchPublicPortfolioBySlug } from '../../_lib/public-portfolio.js'
import {
  portfolioOgDescription,
  portfolioOgImageApiUrl,
  portfolioOgTitle,
  publicPortfolioPageUrl,
} from '../../_lib/portfolio-og-meta.js'

function escapeHtml (s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function handlePortfolioShareHtml (
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).end()
  }

  const slug = typeof req.query.slug === 'string' ? req.query.slug.trim() : ''
  if (!slug) {
    return res.status(400).send('Missing slug')
  }

  try {
    const portfolio = await fetchPublicPortfolioBySlug(slug)
    if (!portfolio) {
      return res.status(404).send('Portfolio not found')
    }

    const pageUrl = publicPortfolioPageUrl(portfolio.slug)
    const title = portfolioOgTitle(portfolio)
    const description = portfolioOgDescription(portfolio)
    const image = portfolioOgImageApiUrl(portfolio.slug)

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${escapeHtml(pageUrl)}" />
  <meta property="og:type" content="profile" />
  <meta property="og:url" content="${escapeHtml(pageUrl)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />
  <meta http-equiv="refresh" content="0;url=${escapeHtml(pageUrl)}" />
</head>
<body>
  <p><a href="${escapeHtml(pageUrl)}">View portfolio on Beonely</a></p>
</body>
</html>`

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600')
    return res.status(200).send(html)
  } catch {
    return res.status(500).send('error')
  }
}
