import { handleJobShareHtml } from './_handlers/job/share-html.js'

export const config = {
  runtime: 'edge',
} as const

type JobPreviewMode = 'share'

function jobPreviewMode (request: Request): JobPreviewMode | null {
  const url = new URL(request.url)
  if (url.searchParams.get('mode') === 'share') return 'share'
  if (url.pathname.includes('/share/job')) return 'share'
  return null
}

export default async function handler (request: Request): Promise<Response> {
  const mode = jobPreviewMode(request)
  if (mode === 'share') {
    return handleJobShareHtml(request)
  }
  return new Response('Not found', { status: 404 })
}
