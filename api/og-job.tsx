import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ImageResponse } from '@vercel/og'
import { fetchPublicJobBySlug } from './_lib/public-job.js'
import { OgJobCard } from './_lib/og-job-card.js'
import { serverSiteOrigin } from './_lib/site-origin.js'

export default async function handler (req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).end()
  }

  const slug = typeof req.query.slug === 'string' ? req.query.slug.trim() : ''
  if (!slug) {
    return res.status(400).send('Missing slug')
  }

  try {
    const job = await fetchPublicJobBySlug(slug)
    if (!job) {
      return res.status(404).send('Job not found')
    }

    const origin = serverSiteOrigin()
    const beonelyLogoUrl = `${origin}/images/beonely-logo.png`

    const image = new ImageResponse(
      <OgJobCard job={job} beonelyLogoUrl={beonelyLogoUrl} />,
      {
        width: 1200,
        height: 630,
      }
    )

    const buffer = Buffer.from(await image.arrayBuffer())
    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400')
    return res.status(200).send(buffer)
  } catch {
    return res.status(500).send('error')
  }
}
