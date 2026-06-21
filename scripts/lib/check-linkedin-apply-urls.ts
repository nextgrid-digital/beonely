import { isStillAcceptingApplications } from './scrape-linkedin-jobs'

type FetchLike = (input: URL | RequestInfo, init?: RequestInit) => Promise<Response>

export type ApplyUrlLivenessReason =
  | 'ok'
  | 'gone'
  | 'closed'
  | 'http_error'
  | 'request_failed'

export type ApplyUrlLiveness = {
  url: string
  /** Whether the listing still exists and is accepting applications. */
  live: boolean
  status: number | null
  reason: ApplyUrlLivenessReason
}

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

/**
 * Check whether a LinkedIn job page still exists and is open.
 *
 * Conservative by design: only definitive 404/410 responses or an explicit
 * "no longer accepting applications" marker mark a URL as dead. Transient
 * failures and ambiguous non-OK responses are treated as live so a flaky
 * request never expires a real listing.
 */
export async function checkLinkedInApplyUrl(
  url: string,
  options: {
    timeoutMs?: number
    userAgent?: string
    fetchImpl?: FetchLike
  } = {}
): Promise<ApplyUrlLiveness> {
  const fetchImpl = options.fetchImpl ?? fetch
  const timeoutMs = options.timeoutMs ?? 20_000
  const userAgent = options.userAgent ?? DEFAULT_USER_AGENT

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      headers: {
        'user-agent': userAgent,
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9',
      },
      signal: controller.signal,
    })

    if (response.status === 404 || response.status === 410) {
      return { url, live: false, status: response.status, reason: 'gone' }
    }

    if (!response.ok) {
      return { url, live: true, status: response.status, reason: 'http_error' }
    }

    const html = await response.text()
    if (!isStillAcceptingApplications(html)) {
      return { url, live: false, status: response.status, reason: 'closed' }
    }

    return { url, live: true, status: response.status, reason: 'ok' }
  } catch {
    return { url, live: true, status: null, reason: 'request_failed' }
  } finally {
    clearTimeout(timeout)
  }
}
