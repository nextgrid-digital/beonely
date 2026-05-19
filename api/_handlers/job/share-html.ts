import { fetchPublicJobBySlug } from '../../_lib/public-job.js'
import {
  jobOgDescription,
  jobOgImageApiUrl,
  jobOgTitle,
  publicJobPageUrl,
} from '../../_lib/job-og-meta.js'

function escapeHtml (s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function handleJobShareHtml (request: Request): Promise<Response> {
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

    const pageUrl = publicJobPageUrl(job.job_slug)
    const title = jobOgTitle(job)
    const description = jobOgDescription(job)
    const image = jobOgImageApiUrl(job.job_slug)

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${escapeHtml(pageUrl)}" />
  <meta property="og:type" content="website" />
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
  <p><a href="${escapeHtml(pageUrl)}">View job on Beonely</a></p>
</body>
</html>`

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=3600',
      },
    })
  } catch {
    return new Response('error', { status: 500 })
  }
}
