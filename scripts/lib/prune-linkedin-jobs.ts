import {
  normalizeLinkedInApplyUrl,
  type IngestLinkedInJobInput,
} from './ingest-linkedin-jobs'

export type LinkedInClosedDetection = {
  closed: boolean
  reason: string
}

const CLOSED_PATTERNS: Array<{ token: string; reason: string }> = [
  { token: 'no longer accepting applications', reason: 'content_no_longer_accepting' },
  { token: 'job is no longer available', reason: 'content_no_longer_available' },
  { token: 'this job is no longer available', reason: 'content_no_longer_available' },
  { token: 'the job you are looking for is no longer active', reason: 'content_no_longer_active' },
  { token: 'this job has expired', reason: 'content_job_expired' },
  { token: 'this job was removed', reason: 'content_job_removed' },
]

export function detectLinkedInClosedSignal(input: {
  status: number
  body: string
}): LinkedInClosedDetection {
  if (input.status === 404 || input.status === 410) {
    return { closed: true, reason: `http_${input.status}` }
  }

  const normalizedBody = input.body.toLowerCase().replace(/\s+/g, ' ')
  for (const pattern of CLOSED_PATTERNS) {
    if (normalizedBody.includes(pattern.token)) {
      return { closed: true, reason: pattern.reason }
    }
  }

  if (input.status === 403 || input.status === 429 || input.status === 999) {
    return { closed: false, reason: `blocked_${input.status}` }
  }

  if (input.status >= 500) {
    return { closed: false, reason: `server_${input.status}` }
  }

  return { closed: false, reason: 'no_close_signal' }
}

export function buildCanonicalApplyUrlSet(
  jobs: IngestLinkedInJobInput[]
): Set<string> {
  const urls = new Set<string>()
  for (const job of jobs) {
    urls.add(normalizeLinkedInApplyUrl(job.apply_url))
  }
  return urls
}
