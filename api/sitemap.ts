import type { VercelRequest, VercelResponse } from '@vercel/node'
import { tryGetServiceSupabase } from './_lib/supabase'

function escapeXml (s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export default async function handler (req: VercelRequest, res: VercelResponse) {
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
    const { data: jobsRaw } = await sb
      .from('jobs')
      .select('job_slug, updated_at, listing_expires_at')
      .eq('approval_status', 'approved')
      .eq('payment_status', 'paid')

    const now = Date.now()
    const jobs = (jobsRaw ?? []).filter(
      (j) =>
        !j.listing_expires_at || new Date(j.listing_expires_at).getTime() > now
    )

    const site =
      process.env.VITE_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
      'https://beonely.example.com'

    const urls = jobs.map((j) => {
      const loc = `${site}/jobs/${escapeXml(j.job_slug)}`
      const lastmod = (j.updated_at as string)?.slice(0, 10) ?? ''
      return `<url><loc>${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`
    })

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>${site}/</loc></url>
${urls.join('\n')}
</urlset>`

    res.setHeader('Content-Type', 'application/xml')
    return res.status(200).send(xml)
  } catch {
    return res.status(500).send('error')
  }
}
