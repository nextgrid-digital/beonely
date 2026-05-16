import { AxiosError } from 'axios'

const FLOW_SCOPED_QUERY_ROOTS = new Set([
  'beonely-application',
  'beonely-applications',
  'job-application',
  'job-applications',
  'job-seeker-profile',
  'job-seeker-profile-completion',
])

const FLOW_SCOPED_URL_PATTERNS = [
  /auth/i,
  /application/i,
  /job_seeker_profiles/i,
  /candidate/i,
  /profile/i,
]

const RECENT_500_SIGNATURE_TTL_MS = 15_000
const SAME_CYCLE_WINDOW_MS = 3_000
const recent500FailureSignatures = new Map<string, number>()

function queryKeyRoot(queryKey: readonly unknown[] | undefined): string {
  if (!Array.isArray(queryKey) || queryKey.length === 0) return ''
  return typeof queryKey[0] === 'string' ? queryKey[0] : ''
}

function queryErrorSignature(
  queryKey: readonly unknown[] | undefined,
  requestUrl: string
): string {
  return `${queryKeyRoot(queryKey)}::${requestUrl}`
}

function pruneRecent500Signatures(now: number) {
  for (const [signature, ts] of recent500FailureSignatures.entries()) {
    if (now - ts > RECENT_500_SIGNATURE_TTL_MS) {
      recent500FailureSignatures.delete(signature)
    }
  }
}

function hasRecent500Failure(signature: string, now: number): boolean {
  const last = recent500FailureSignatures.get(signature)
  recent500FailureSignatures.set(signature, now)
  if (typeof last !== 'number') return false
  if (now < last) return false
  return now - last < SAME_CYCLE_WINDOW_MS
}

export function shouldBypassGlobal500Redirect(
  queryKey: readonly unknown[] | undefined,
  requestUrl: string
): boolean {
  const root = queryKeyRoot(queryKey)
  if (FLOW_SCOPED_QUERY_ROOTS.has(root)) return true
  const haystack = `${root} ${requestUrl}`.toLowerCase()
  return FLOW_SCOPED_URL_PATTERNS.some((pattern) => pattern.test(haystack))
}

export function shouldNavigateTo500FromQueryError(
  error: unknown,
  queryKey: readonly unknown[] | undefined,
  opts?: {
    currentPathname?: string
    now?: number
  }
): boolean {
  if (!(error instanceof AxiosError)) return false
  if (error.response?.status !== 500) return false
  if (opts?.currentPathname === '/500') return false
  const requestUrl = String(error.config?.url ?? '')
  if (shouldBypassGlobal500Redirect(queryKey, requestUrl)) return false

  const now = opts?.now ?? Date.now()
  pruneRecent500Signatures(now)
  const signature = queryErrorSignature(queryKey, requestUrl)
  return !hasRecent500Failure(signature, now)
}
