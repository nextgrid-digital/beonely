import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  jobOgDescription,
  jobOgImageApiUrl,
  jobOgTitle,
  publicJobPageUrl,
} from '../../_lib/job-og-meta.js'
import { fetchPublicJobBySlug } from '../../_lib/public-job.js'
import { isValidJobSlug } from '../../_lib/public-slug.js'
import { isRateLimitError, rateLimitOrThrow } from '../../_lib/rate-limit.js'
import { requestIp } from '../../_lib/request-ip.js'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function handleJobShareHtml(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).end()
  }

  const slug = typeof req.query.slug === 'string' ? req.query.slug.trim() : ''
  if (!isValidJobSlug(slug)) {
    return res.status(400).send('Invalid slug')
  }

  try {
    await rateLimitOrThrow(`share-html:${requestIp(req)}`, {
      limit: 120,
      windowSeconds: 300,
    })
    const job = await fetchPublicJobBySlug(slug)
    if (!job) {
      return res.status(404).send('Job not found')
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

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600')
    return res.status(200).send(html)
  } catch (error) {
    if (isRateLimitError(error)) {
      res.setHeader('Retry-After', String(error.retryAfterSeconds))
      return res.status(error.statusCode).send(error.code)
    }
    return res.status(500).send('error')
  }
}
