import type { SupabaseClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { serverSiteOrigin } from './_lib/site-origin.js'
import { tryGetServiceSupabase } from './_lib/supabase.js'

type SitemapJobRow = {
  id: string
  job_slug: string
  updated_at: string | null
}

type SitemapPortfolioRow = {
  id: string
  public_slug: string | null
  updated_at: string | null
}

type StaticSitemapEntry = {
  path: string
  lastmod?: string
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const PAGE_SIZE = 1_000
const SITEMAP_URL_LIMIT = 50_000

async function fetchPublicJobs(
  sb: SupabaseClient,
  limit: number
): Promise<SitemapJobRow[]> {
  const rows: SitemapJobRow[] = []
  for (let offset = 0; offset < limit; offset += PAGE_SIZE) {
    const last = Math.min(offset + PAGE_SIZE, limit) - 1
    const { data, error } = await sb
      .from('public_jobs')
      .select('id, job_slug, updated_at')
      .order('id', { ascending: true })
      .range(offset, last)
    if (error) throw new Error(`sitemap_jobs_failed: ${error.message}`)
    const page = (data ?? []) as SitemapJobRow[]
    rows.push(...page)
    if (page.length < last - offset + 1) break
  }
  return rows
}

async function fetchPublicPortfolios(
  sb: SupabaseClient,
  limit: number
): Promise<SitemapPortfolioRow[]> {
  const rows: SitemapPortfolioRow[] = []
  for (let offset = 0; offset < limit; offset += PAGE_SIZE) {
    const last = Math.min(offset + PAGE_SIZE, limit) - 1
    const { data, error } = await sb
      .from('job_seeker_profiles')
      .select('id, public_slug, updated_at')
      .eq('is_public', true)
      .not('public_slug', 'is', null)
      .order('id', { ascending: true })
      .range(offset, last)
    if (error) throw new Error(`sitemap_portfolios_failed: ${error.message}`)
    const page = (data ?? []) as SitemapPortfolioRow[]
    rows.push(...page)
    if (page.length < last - offset + 1) break
  }
  return rows
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).end()
  }
  try {
    const supInit = tryGetServiceSupabase()
    if (!supInit.ok) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      return res
        .status(503)
        .send(
          'Sitemap unavailable: set SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL (or VITE_SUPABASE_URL) on Vercel. See docs/vercel-environment.md.'
        )
    }
    const sb = supInit.client
    const staticUrls: StaticSitemapEntry[] = [
      { path: '/' },
      { path: '/hire' },
      { path: '/hire/faq' },
      { path: '/hire/contract-servicenow-talent' },
      { path: '/hire/remote-servicenow-talent' },
      { path: '/hire/servicenow-developers' },
      { path: '/hire/servicenow-architects' },
      { path: '/hire/servicenow-consultants' },
      { path: '/hire/servicenow-admins' },
      { path: '/changelog' },
    ]

    const dynamicLimit = SITEMAP_URL_LIMIT - staticUrls.length
    const jobs = await fetchPublicJobs(sb, dynamicLimit)
    const portfolios = await fetchPublicPortfolios(
      sb,
      Math.max(0, dynamicLimit - jobs.length)
    )
    const site = escapeXml(serverSiteOrigin())

    const urls = jobs.map((j) => {
      const loc = `${site}/jobs/${encodeURIComponent(j.job_slug)}`
      const lastmod = (j.updated_at as string)?.slice(0, 10) ?? ''
      return `<url><loc>${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`
    })

    const portfolioUrls = portfolios
      .filter(
        (
          p
        ): p is SitemapPortfolioRow & {
          public_slug: string
        } => Boolean(p.public_slug)
      )
      .map((p) => {
        const loc = `${site}/p/${encodeURIComponent(p.public_slug)}`
        const lastmod = (p.updated_at as string)?.slice(0, 10) ?? ''
        return `<url><loc>${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`
      })

    const staticXml = staticUrls.map((entry) => {
      const loc = `${site}${entry.path}`
      return `<url><loc>${loc}</loc>${entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : ''}</url>`
    })

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticXml.join('\n')}
${urls.join('\n')}
${portfolioUrls.join('\n')}
</urlset>`

    res.setHeader('Content-Type', 'application/xml')
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=900')
    return res.status(200).send(xml)
  } catch {
    return res.status(503).send('Sitemap temporarily unavailable')
  }
}
