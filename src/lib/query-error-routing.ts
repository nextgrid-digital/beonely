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

function queryKeyRoot(queryKey: readonly unknown[] | undefined): string {
  if (!Array.isArray(queryKey) || queryKey.length === 0) return ''
  return typeof queryKey[0] === 'string' ? queryKey[0] : ''
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

/** App never navigates to /500; flows handle errors inline. */
export function shouldNavigateTo500FromQueryError(): boolean {
  return false
}
