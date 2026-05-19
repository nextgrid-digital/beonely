import { ImageResponse } from '@vercel/og'
import { fetchPublicJobBySlug } from '../../_lib/public-job.js'
import { OgJobCard } from '../../_lib/og-job-card.js'
import { serverSiteOrigin } from '../../_lib/site-origin.js'

export async function handleJobOgImage (request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return new Response(null, { status: 405 })
  }

  const slug = new URL(request.url).searchParams.get('slug')?.trim() ?? ''
  if (!slug) {
    return new Response('Missing slug', { status: 400 })
  }

  try {
    const job = await fetchPublicJobBySlug(slug)
    if (!job) {
      return new Response('Job not found', { status: 404 })
    }

    const origin = serverSiteOrigin()
    const beonelyLogoUrl = `${origin}/images/beonely-logo.png`

    return new ImageResponse(
      <OgJobCard job={job} beonelyLogoUrl={beonelyLogoUrl} />,
      {
        width: 1200,
        height: 630,
        headers: {
          'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        },
      }
    )
  } catch (e) {
    const message = e instanceof Error ? e.message : 'error'
    return new Response(message, { status: 500 })
  }
}
