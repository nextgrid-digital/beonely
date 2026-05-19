import { handleJobOgImage } from './_handlers/job/og-image.js'
import { handleJobShareHtml } from './_handlers/job/share-html.js'

export const config = {
  runtime: 'edge',
}

type JobPreviewMode = 'og' | 'share'

function jobPreviewMode (request: Request): JobPreviewMode | null {
  const url = new URL(request.url)
  const fromQuery = url.searchParams.get('mode')
  if (fromQuery === 'og' || fromQuery === 'share') {
    return fromQuery
  }

  if (url.pathname.includes('/og/job')) return 'og'
  if (url.pathname.includes('/share/job')) return 'share'
  return null
}

export default async function handler (request: Request): Promise<Response> {
  const mode = jobPreviewMode(request)
  if (mode === 'og') {
    return handleJobOgImage(request)
  }
  if (mode === 'share') {
    return handleJobShareHtml(request)
  }
  return new Response('Not found', { status: 404 })
}
