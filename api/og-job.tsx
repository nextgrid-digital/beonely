import type { ReactElement } from 'react'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { jobOgMetaChips, truncateText } from './_lib/job-og-meta.js'
import { portfolioOgChips } from './_lib/portfolio-og-meta.js'
import { fetchPublicJobBySlug, type PublicJobRow } from './_lib/public-job.js'
import {
  fetchPublicPortfolioBySlug,
  type PublicPortfolio,
} from './_lib/public-portfolio.js'
import { isValidJobSlug, isValidPortfolioSlug } from './_lib/public-slug.js'
import { isRateLimitError, rateLimitOrThrow } from './_lib/rate-limit.js'
import { requestIp } from './_lib/request-ip.js'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'B'
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase()
  return (
    parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)
  ).toUpperCase()
}

function OgPortfolioCardInline({ portfolio }: { portfolio: PublicPortfolio }) {
  const name = truncateText(portfolio.name, 56)
  const headline = portfolio.headline
    ? truncateText(portfolio.headline, 64)
    : null
  const chips = portfolioOgChips(portfolio)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background:
          'linear-gradient(145deg, #fafafa 0%, #f4f4f5 45%, #ffffff 100%)',
        fontFamily: 'Inter, system-ui, sans-serif',
        color: '#18181b',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '40px 48px 24px',
        }}
      >
        <div
          style={{
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: '#52525b',
          }}
        >
          ServiceNow portfolio
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: '-0.03em',
            color: '#18181b',
          }}
        >
          Beonely
        </div>
      </div>
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          padding: '0 48px 32px',
          gap: 36,
        }}
      >
        {portfolio.avatar ? (
          <img
            src={portfolio.avatar}
            width={180}
            height={180}
            style={{
              width: 180,
              height: 180,
              borderRadius: 999,
              objectFit: 'cover',
              border: '4px solid #ffffff',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            }}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 180,
              height: 180,
              borderRadius: 999,
              background: '#e4e4e7',
              color: '#52525b',
              fontSize: 64,
              fontWeight: 700,
            }}
          >
            {initials(portfolio.name)}
          </div>
        )}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div
            style={{
              fontSize: 56,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
            }}
          >
            {name}
          </div>
          {headline ? (
            <div style={{ fontSize: 30, fontWeight: 500, color: '#3f3f46' }}>
              {headline}
            </div>
          ) : null}
          {chips.length > 0 ? (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 10,
                marginTop: 8,
              }}
            >
              {chips.map((chip) => (
                <div
                  key={chip}
                  style={{
                    fontSize: 18,
                    padding: '8px 16px',
                    borderRadius: 999,
                    border: '1px solid #e4e4e7',
                    background: '#ffffff',
                    color: '#3f3f46',
                  }}
                >
                  {chip}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '24px 48px',
          borderTop: '1px solid #e4e4e7',
          background: '#ffffff',
          fontSize: 20,
          color: '#71717a',
        }}
      >
        <span>beonely.in</span>
        <span>View portfolio on Beonely</span>
      </div>
    </div>
  )
}

function OgJobCardInline({ job }: { job: PublicJobRow }) {
  const chips = jobOgMetaChips(job)
  const title = truncateText(job.job_title, 72)
  const company = truncateText(job.company_name, 48)
  const location = job.location?.trim() ? truncateText(job.location, 56) : null

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background:
          'linear-gradient(145deg, #fafafa 0%, #f4f4f5 45%, #ffffff 100%)',
        fontFamily: 'Inter, system-ui, sans-serif',
        color: '#18181b',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '40px 48px 24px',
        }}
      >
        <div
          style={{
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: '#52525b',
          }}
        >
          ServiceNow hiring
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: '-0.03em',
            color: '#18181b',
          }}
        >
          Beonely
        </div>
      </div>
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 48px 32px',
          gap: 16,
        }}
      >
        <div
          style={{
            fontSize: 52,
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            maxWidth: 1000,
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 32, fontWeight: 500, color: '#3f3f46' }}>
          {company}
        </div>
        {location ? (
          <div style={{ fontSize: 24, color: '#71717a' }}>{location}</div>
        ) : null}
        {chips.length > 0 ? (
          <div
            style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 8 }}
          >
            {chips.map((chip) => (
              <div
                key={chip}
                style={{
                  fontSize: 18,
                  padding: '8px 16px',
                  borderRadius: 999,
                  border: '1px solid #e4e4e7',
                  background: '#ffffff',
                  color: '#3f3f46',
                }}
              >
                {chip}
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '24px 48px',
          borderTop: '1px solid #e4e4e7',
          background: '#ffffff',
          fontSize: 20,
          color: '#71717a',
        }}
      >
        <span>beonely.com</span>
        <span>Apply on Beonely</span>
      </div>
    </div>
  )
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).end()
  }

  const slug = typeof req.query.slug === 'string' ? req.query.slug.trim() : ''
  if (!slug) {
    return res.status(400).send('Missing slug')
  }

  const isPortfolio = req.query.type === 'portfolio'
  const validSlug = isPortfolio
    ? isValidPortfolioSlug(slug)
    : isValidJobSlug(slug)
  if (!validSlug) {
    return res.status(400).send('Invalid slug')
  }

  try {
    await rateLimitOrThrow(`og-image:${requestIp(req)}`, {
      limit: 30,
      windowSeconds: 300,
    })
    let element: ReactElement
    if (isPortfolio) {
      const portfolio = await fetchPublicPortfolioBySlug(slug)
      if (!portfolio) {
        return res.status(404).send('Portfolio not found')
      }
      element = <OgPortfolioCardInline portfolio={portfolio} />
    } else {
      const job = await fetchPublicJobBySlug(slug)
      if (!job) {
        return res.status(404).send('Job not found')
      }
      element = <OgJobCardInline job={job} />
    }

    const { ImageResponse } = await import('@vercel/og')
    const image = new ImageResponse(element, {
      width: 1200,
      height: 630,
    })

    const buffer = Buffer.from(await image.arrayBuffer())
    res.setHeader('Content-Type', 'image/png')
    res.setHeader(
      'Cache-Control',
      isPortfolio ? 'private, no-store' : 'public, max-age=3600, s-maxage=86400'
    )
    return res.status(200).send(buffer)
  } catch (error) {
    if (isRateLimitError(error)) {
      res.setHeader('Retry-After', String(error.retryAfterSeconds))
      return res.status(error.statusCode).send(error.code)
    }
    return res.status(500).send('error')
  }
}
